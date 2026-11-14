import { API_URL } from "./api";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  picture: string | null;
}

// "credentials: include" makes the browser send the session cookie to the backend
export async function fetchCurrentUser(
  signal?: AbortSignal,
): Promise<AuthUser | null> {
  const response = await fetch(`${API_URL}/auth/me`, {
    credentials: "include",
    signal,
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return (await response.json()) as AuthUser;
}

// Login is a full-page redirect to Google, not a fetch
export function getLoginUrl(): string {
  return `${API_URL}/auth/google`;
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}