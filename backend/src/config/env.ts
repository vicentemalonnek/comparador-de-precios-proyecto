import process from "node:process";

// process.env works both in Deno (locally, filled from backend/.env by
// --env-file) and in Node (on Vercel, filled from the project settings).
export function readEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}
