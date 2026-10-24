import { db } from "./src/db/client.ts";



const port = Number(Deno.env.get("PORT") ?? 8000);

const allowedOrigins = (
  Deno.env.get("FRONTEND_URLS") ??
    "http://localhost:5173,http://127.0.0.1:5173"
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
  }

  return headers;
}

Deno.serve({ port }, (req: Request): Response => {
  const corsHeaders = getCorsHeaders(req);

  // Browsers send an OPTIONS "preflight" request before some cross-origin calls
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (url.pathname === "/health") {
  db.prepare("SELECT 1").get();
  return Response.json({ status: "ok", database: "ok" }, { headers: corsHeaders });
  }

  return new Response("Not found", { status: 404, headers: corsHeaders });
});