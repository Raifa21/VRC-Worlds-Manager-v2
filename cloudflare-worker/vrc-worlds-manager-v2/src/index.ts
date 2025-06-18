import { z } from "zod";
import { WorldDataSchema } from "./schemas/world";
import type { D1Database, R2Bucket, KVNamespace } from "@cloudflare/workers-types";

/** All bindings injected at runtime */
export interface Env {
  /** D1 binding for folder metadata */
  FOLDERS_DB: D1Database;
  /** R2 binding for folder JSON blobs */
  FOLDER_DATA: R2Bucket;
  /** KV namespace for rate limiting */
  RATE_LIMIT_KV: KVNamespace;
  /** HMAC secret (set via Wrangler vars) */
  HMAC_SECRET: string;
}

/** Minimal shape of client payload */
const ShareRequestSchema = z
  .object({
    name: z.string().min(1).max(255),
    worlds: z.array(WorldDataSchema).max(1000),
    hmac: z.string(),
  })
  .strict();

type ShareRequest = z.infer<typeof ShareRequestSchema>;
type FolderData = Omit<ShareRequest, "hmac">;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
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
      return handleDownload(m[1], env);
    }
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: corsHeaders(),
    });
  },
};

async function recordAndCheckLimit(ip: string, env: Env): Promise<boolean> {
  // key per IP per hour
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `rl:${ip}:${hour}`;
  const prev = await env.RATE_LIMIT_KV.get(key);
  const count = prev ? parseInt(prev) : 0;
  if (count >= 10) return false;
  await env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: 3_600 });
  return true;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  try {
    if (!request.headers.get("Content-Type")?.includes("application/json")) {
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

    const { name, worlds, hmac } = payload;
    const data = JSON.stringify({ name, worlds });
    const expected = await computeHMAC(env.HMAC_SECRET, data);
    if (expected !== hmac) {
      return new Response(
        JSON.stringify({ error: "HMAC mismatch" }),
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
    const expiration = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    await env.FOLDERS_DB.prepare(
      `INSERT INTO folders
         (id, hmac, name, expiration, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
      .bind(id, hmac, name, expiration)
      .run();

    // Store the JSON blob in R2
    await env.FOLDER_DATA.put(`folders/${id}.json`, data, {
      httpMetadata: { contentType: 'application/json' }
    });

    return new Response(
      JSON.stringify({ id }),
      { status: 200, headers: corsHeaders() }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders() }
    );
  }
}

async function handleDownload(id: string, env: Env): Promise<Response> {
  try {
    // Lookup metadata & expiry
    const rec = await env.FOLDERS_DB.prepare(
      `SELECT expiration
       FROM folders
       WHERE id = ?
       LIMIT 1`
    )
      .bind(id)
      .first<{ expiration: string }>();

    if (!rec || new Date(rec.expiration) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Not found or expired' }),
        { status: 404, headers: corsHeaders() }
      );
    }

    // Fetch JSON blob
    const obj = await env.FOLDER_DATA.get(`folders/${id}.json`);
    if (!obj) {
      return new Response(
        JSON.stringify({ error: 'Data missing' }),
        { status: 500, headers: corsHeaders() }
      );
    }

    const body = await obj.text();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders() }
    );
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
