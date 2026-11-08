import { db } from "../db/client.ts";
import { authConfig } from "../config/auth.config.ts";
import { randomToken } from "../utils/crypto.ts";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export const SESSION_MS = authConfig.sessionDays * 24 * 60 * 60 * 1000;

export function upsertUser(profile: GoogleProfile): number {
  db.prepare(
    `INSERT INTO users (google_sub, email, name, picture) VALUES (?, ?, ?, ?)
     ON CONFLICT(google_sub) DO UPDATE SET
       email = excluded.email, name = excluded.name, picture = excluded.picture`,
  ).run(profile.sub, profile.email, profile.name ?? null, profile.picture ?? null);

  const row = db.prepare("SELECT id FROM users WHERE google_sub = ?")
    .get(profile.sub) as unknown as { id: number };
  return row.id;
}

export function createSession(userId: number): string {
  const id = randomToken();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .run(id, userId, Date.now() + SESSION_MS);
  return id;
}

export function getUserBySession(sessionId: string): AuthUser | null {
  const row = db.prepare(
    `SELECT u.id, u.email, u.name, u.picture
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
  ).get(sessionId, Date.now());

  return (row as unknown as AuthUser | undefined) ?? null;
}

export function deleteSession(sessionId: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}