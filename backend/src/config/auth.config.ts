import { readEnv } from "./env.ts";

export const authConfig = {
  clientId: readEnv("GOOGLE_CLIENT_ID"),
  clientSecret: readEnv("GOOGLE_CLIENT_SECRET"),
  backendUrl: readEnv("BACKEND_URL", "http://localhost:8000"),
  frontendUrl: readEnv("FRONTEND_URL", "http://localhost:5173"),
  sessionDays: 7,
};
