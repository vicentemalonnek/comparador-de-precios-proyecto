// HTTP routes of the backend. The same handler runs locally with Deno.serve
// (main.ts) and on Vercel as a function (frontend/api/index.ts).
import { getDb } from "./db/client.ts";
import { readEnv } from "./config/env.ts";
import {
  getPriceHistory,
  listComparisons,
  listProducts,
} from "./services/product.service.ts";
import { handleAuthRequest } from "./routes/auth.routes.ts";
import { listBranches } from "./services/branch.service.ts";

const allowedOrigins = readEnv(
  "FRONTEND_URLS",
  "http://localhost:5173,http://127.0.0.1:5173",
).split(",");

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };

  // Echo the origin back only if it is in the allowed list
  if (allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    // Lets the browser send and accept the session cookie
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

async function route(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Browsers send an OPTIONS "preflight" request before some cross-origin calls
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (url.pathname === "/health") {
    await getDb().execute("SELECT 1");
    return Response.json(
      { status: "ok", database: "ok" },
      { headers: corsHeaders },
    );
  }

  if (url.pathname === "/api/products" && req.method === "GET") {
    const category = url.searchParams.get("category");
    return Response.json(await listProducts(category), {
      headers: corsHeaders,
    });
  }

  const authResponse = await handleAuthRequest(req, url, corsHeaders);
  if (authResponse) return authResponse;

  const historyMatch = url.pathname.match(/^\/api\/products\/(\d+)\/prices$/);
  if (historyMatch && req.method === "GET") {
    return Response.json(
      await getPriceHistory(Number(historyMatch[1])),
      { headers: corsHeaders },
    );
  }

  if (url.pathname === "/api/comparisons" && req.method === "GET") {
    const category = url.searchParams.get("category");
    return Response.json(await listComparisons(category), {
      headers: corsHeaders,
    });
  }

  if (url.pathname === "/api/branches" && req.method === "GET") {
    return Response.json(await listBranches(), { headers: corsHeaders });
  }

  return new Response("Not found", { status: 404, headers: corsHeaders });
}

export async function handleRequest(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  try {
    return await route(req, corsHeaders);
  } catch (error) {
    // For example, the database is unreachable: answer 500 instead of crashing
    console.error(error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
