import { db } from "./src/db/client.ts";
import { listProducts } from "./src/services/product.service.ts";
import { handleAuthRequest } from "./src/routes/auth.routes.ts";

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
    // Lets the browser send and accept the session cookie
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

Deno.serve({ port }, async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  // Browsers send an OPTIONS "preflight" request before some cross-origin calls
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (url.pathname === "/health") {
    db.prepare("SELECT 1").get();
    return Response.json(
      { status: "ok", database: "ok" },
      { headers: corsHeaders },
    );
  }

  if (url.pathname === "/api/products" && req.method === "GET") {
    const category = url.searchParams.get("category");
    return Response.json(listProducts(category), { headers: corsHeaders });
  }

  const authResponse = await handleAuthRequest(req, url, corsHeaders);
  if (authResponse) return authResponse;

  return new Response("Not found", { status: 404, headers: corsHeaders });
});