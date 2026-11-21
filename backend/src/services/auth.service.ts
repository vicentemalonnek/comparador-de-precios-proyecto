import { getDb } from "../db/client.ts";
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

export async function upsertUser(profile: GoogleProfile): Promise<number> {
  const { rows } = await getDb().execute(
    `INSERT INTO users (google_sub, email, name, picture) VALUES (?, ?, ?, ?)
     ON CONFLICT(google_sub) DO UPDATE SET
       email = excluded.email, name = excluded.name, picture = excluded.picture
     RETURNING id`,
    [profile.sub, profile.email, profile.name ?? null, profile.picture ?? null],
  );
  return Number(rows[0].id);
}

export async function createSession(userId: number): Promise<string> {
  const id = randomToken();
  await getDb().execute(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    [id, userId, Date.now() + SESSION_MS],
  );
  return id;
}

export async function getUserBySession(
  sessionId: string,
): Promise<AuthUser | null> {
  const { rows } = await getDb().execute(
    `SELECT u.id, u.email, u.name, u.picture
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
    [sessionId, Date.now()],
  );
  return (rows[0] as unknown as AuthUser | undefined) ?? null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await getDb().execute("DELETE FROM sessions WHERE id = ?", [sessionId]);
}
