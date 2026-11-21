// Vercel Function: runs the same backend handler used locally with Deno.
// The "build" script bundles backend/src/app.ts into server/backend.js first.
// vercel.json rewrites /api/*, /auth/* and /health here and passes the
// original path in the "__path" query parameter.
import { handleRequest } from "../server/backend.js";

export default {
  fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.searchParams.get("__path");
    if (path) {
      url.pathname = path;
      url.searchParams.delete("__path");
      url.searchParams.delete("path"); // added by Vercel's rewrite
    }
    return handleRequest(new Request(url, request));
  },
};
