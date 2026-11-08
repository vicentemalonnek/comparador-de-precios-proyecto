export const authConfig = {
  clientId: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
  clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
  backendUrl: Deno.env.get("BACKEND_URL") ?? "http://localhost:8000",
  frontendUrl: Deno.env.get("FRONTEND_URL") ?? "http://localhost:5173",
  sessionDays: 7,
};