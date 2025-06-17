interface Env {
  /** D1 DB binding for folder metadata */
  FOLDERS_DB: D1Database;
  /** R2 bucket binding for folder JSON blobs */
  FOLDER_DATA: R2Bucket;
  /** HMAC secret, set via wrangler.toml or wrangler.jsonc vars */
  HMAC_SECRET: string;
}

/** Minimal shape of client payload */
type ShareRequest = {
  name: string;
  worlds: unknown[];
  hmac: string;
};

/** Shared folder data (what we store in R2) */
type FolderData = Omit<ShareRequest, 'hmac'>;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Upload endpoint
    if (path === '/api/share/folder' && request.method === 'POST') {
      return handleUpload(request, env);
    }

    // Download endpoint
    const m = path.match(/^\/api\/share\/folder\/([^/]+)$/);
    if (m && request.method === 'GET') {
      return handleDownload(m[1], env);
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: corsHeaders() }
    );
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  try {
    if (!request.headers.get('Content-Type')?.includes('application/json')) {
      return new Response(
        JSON.stringify({ error: 'Invalid content type' }),
        { status: 415, headers: corsHeaders() }
      );
    }

    const { name, worlds, hmac } = await request.json() as ShareRequest;

    // Basic payload validation
    if (
      typeof name !== 'string' ||
      !Array.isArray(worlds) ||
      typeof hmac !== 'string'
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: corsHeaders() }
      );
    }

    // Verify HMAC integrity
    const data = JSON.stringify({ name, worlds });
    const expected = await computeHMAC(env.HMAC_SECRET, data);
    if (expected !== hmac) {
      return new Response(
        JSON.stringify({ error: 'HMAC mismatch' }),
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
    await env.FOLDER_DATA.put(`${id}.json`, data, {
      httpMetadata: { contentType: 'application/json' }
    });

    return new Response(
      JSON.stringify({ id }),
      { status: 200, headers: corsHeaders() }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
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
    const obj = await env.FOLDER_DATA.get(`${id}.json`);
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
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data)
  );
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
