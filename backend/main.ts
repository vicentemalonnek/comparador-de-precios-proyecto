const port = Number(Deno.env.get("PORT") ?? 8000);

Deno.serve({ port }, (req: Request): Response => {
  const url = new URL(req.url);

  if (url.pathname === "/health") {
    return Response.json({ status: "ok" });
  }

  return new Response("Not found", { status: 404 });
});