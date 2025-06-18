import { z } from "zod";
import type {
  D1Database,
  R2Bucket,
  KVNamespace,
  ScheduledEvent,
} from "@cloudflare/workers-types";
import { WorldDataSchema } from "./schemas/world";

export interface Env {
  FOLDERS_DB: D1Database;
  FOLDER_DATA: R2Bucket;
  RATE_LIMIT_KV: KVNamespace;
  HMAC_SECRETS: string;
}

const ShareRequestSchema = z
  .object({
    name: z.string().min(1).max(255),
    worlds: z.array(WorldDataSchema).max(1000),
    ts: z
      .string()
      .refine((s) => !isNaN(Date.parse(s)), { message: "Invalid ISO timestamp" }),
    hmac: z.string().length(64),
  })
  .strict();

type ShareRequest = z.infer<typeof ShareRequestSchema>;


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // DEBUG: log every incoming request
    console.log("⏳ fetch() start:", request.method, new URL(request.url).pathname);

    if (request.method === "OPTIONS") {
      console.log("↔️ Preflight");
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    const url = new URL(request.url);
    if (url.pathname === "/api/share/folder" && request.method === "POST") {
      // Rate limit check
      const ip = request.headers.get("CF-Connecting-IP") || "anon";
      if (!(await recordAndCheckLimit(ip, env))) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: corsHeaders() }
        );
      }
      return handleUpload(request, env);
    }
    const m = url.pathname.match(/^\/api\/share\/folder\/([^/]+)$/);
    if (m && request.method === "GET") {
      console.log("📥 Handling download for ID:", m[1]);
      return handleDownload(m[1], env);
    }
    console.log("❓ No route matched");
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: corsHeaders(),
    });
  },

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log("🔄 Running cleanup cron:", event.cron);
    ctx.waitUntil(cleanupExpired(env));
  },
};

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

async function recordAndCheckLimit(
  ip: string,
  env: Env
): Promise<boolean> {
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `rl:${ip}:${hour}`;
  const prev = await env.RATE_LIMIT_KV.get(key);
  const count = prev ? parseInt(prev, 10) : 0;
  if (count >= 10) return false;
  await env.RATE_LIMIT_KV.put(key, String(count + 1), {
    expirationTtl: 3_600,
  });
  return true;
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  try {
    if (!request.headers.get("Content-Type")?.includes("application/json")) {
      console.log("Invalid content type:", request.headers.get("Content-Type"));
      return new Response(
        JSON.stringify({ error: "Invalid content type" }),
        { status: 415, headers: corsHeaders() }
      );
    }

    let payload: ShareRequest;
    try {
      payload = ShareRequestSchema.parse(await request.json());
    } catch (err) {
      console.error("Validation error:", err);
      return new Response(
        JSON.stringify({ error: "Invalid payload structure" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    const { name, worlds, ts, hmac } = payload;
    const clientTs = Date.parse(ts);
    const now = Date.now();
    if (Math.abs(now - clientTs) > 5 * 60 * 1000) {
      console.log("Timestamp out of window:", ts, "vs now", new Date(now).toISOString());
      return new Response(
        JSON.stringify({ error: "Timestamp out of allowable window" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    // --- LOGGING ADDED HERE ---
    console.log("Raw HMAC_SECRETS env:", env.HMAC_SECRETS);
    const secrets = env.HMAC_SECRETS
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    console.log("Parsed HMAC secrets array length:", secrets.length);
    secrets.forEach((s, i) => console.log(`  secret[${i}]:`, s));

    if (secrets.length === 0) {
      console.error("No HMAC_SECRETS configured – aborting");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: corsHeaders() }
      );
    }

    const dataToSign = JSON.stringify({ name, worlds, ts });
    let match = false;
    for (const secret of secrets) {
      if ((await computeHMAC(secret, dataToSign)) === hmac) {
        match = true;
        break;
      }
    }
    if (!match) {
      console.log("HMAC mismatch for payload:", dataToSign);
      return new Response(
        JSON.stringify({ error: "HMAC mismatch or invalid secret version" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    // Check for an existing non‐expired share
    const existing = await env.FOLDERS_DB.prepare(
      `SELECT id, expiration
       FROM folders
       WHERE hmac = ? AND expiration > CURRENT_TIMESTAMP
       LIMIT 1`
    )
      .bind(hmac)
      .first<{ id: string; expiration: string }>();

    if (existing) {
      return new Response(
        JSON.stringify({ id: existing.id }),
        { status: 200, headers: corsHeaders() }
      );
    }

    // Create new share
    const id = crypto.randomUUID();
    const expiration = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
    await env.FOLDERS_DB.prepare(
      `INSERT INTO folders (id, hmac, name, expiration, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
      .bind(id, hmac, name, expiration)
      .run();
    await env.FOLDER_DATA.put(`folders/${id}.json`, JSON.stringify(payload), {
      httpMetadata: { contentType: "application/json" },
    });
    console.log("Created share ID:", id);

    return new Response(JSON.stringify({ id }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (e) {
    console.error("Unhandled error in handleUpload:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders() }
    );
  }
}

async function handleDownload(id: string, env: Env): Promise<Response> {
  try {
    const rec = await env.FOLDERS_DB.prepare(
      `SELECT expiration FROM folders WHERE id = ? LIMIT 1`
    )
      .bind(id)
      .first<{ expiration: string }>();
    if (!rec || new Date(rec.expiration) < new Date()) {
      console.log("Download not found/expired for ID:", id);
      return new Response(
        JSON.stringify({ error: "Not found or expired" }),
        { status: 404, headers: corsHeaders() }
      );
    }
    const obj = await env.FOLDER_DATA.get(`folders/${id}.json`);
    if (!obj) {
      console.error("R2 object missing for ID:", id);
      return new Response(
        JSON.stringify({ error: "Data missing" }),
        { status: 500, headers: corsHeaders() }
      );
    }
    const body = await obj.text();
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  } catch (e) {
    console.error("Unhandled error in handleDownload:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders() }
    );
  }
}

async function cleanupExpired(env: Env) {
  try {
    const { results } = await env.FOLDERS_DB.prepare(
      `SELECT id FROM folders WHERE expiration < CURRENT_TIMESTAMP`
    ).all<{ id: string }>();
    for (const { id } of results) {
      await env.FOLDER_DATA.delete(`folders/${id}.json`);
      await env.FOLDERS_DB.prepare(
        `DELETE FROM folders WHERE id = ?`
      )
        .bind(id)
        .run();
      console.log("Cleaned up share:", id);
    }
  } catch (err) {
    console.error("Error during cleanup:", err);
  }
}

async function computeHMAC(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

