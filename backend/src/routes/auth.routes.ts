import { authConfig } from "../config/auth.config.ts";
import {
  createSession,
  deleteSession,
  getUserBySession,
  type GoogleProfile,
  SESSION_MS,
  upsertUser,
} from "../services/auth.service.ts";
import { randomToken, sha256Base64Url } from "../utils/crypto.ts";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

const SESSION_COOKIE = "session";
const STATE_COOKIE = "oauth_state";
const VERIFIER_COOKIE = "oauth_verifier";

const redirectUri = `${authConfig.backendUrl}/auth/google/callback`;
const isSecure = authConfig.backendUrl.startsWith("https://");

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function buildCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
  path = "/",
): string {
  // HttpOnly: JavaScript in the page cannot read it. SameSite=Lax: not sent on cross-site POSTs.
  return `${name}=${value}; Path=${path}; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax${
    isSecure ? "; Secure" : ""
  }`;
}

export async function handleAuthRequest(
  req: Request,
  url: URL,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  if (req.method === "GET" && url.pathname === "/auth/google") {
    return await startLogin();
  }
  if (req.method === "GET" && url.pathname === "/auth/google/callback") {
    return await finishLogin(req, url);
  }
  if (req.method === "GET" && url.pathname === "/auth/me") {
    return currentUser(req, corsHeaders);
  }
  if (req.method === "POST" && url.pathname === "/auth/logout") {
    return logout(req, corsHeaders);
  }
  return null; // not an auth route
}

// Step 1: send the user to Google
async function startLogin(): Promise<Response> {
  if (!authConfig.clientId || !authConfig.clientSecret) {
    return new Response("Google login is not configured", { status: 500 });
  }

  const state = randomToken(); // protects against forged callbacks (CSRF)
  const verifier = randomToken(); // PKCE secret, only the backend knows it
  const challenge = await sha256Base64Url(verifier);

  const params = new URLSearchParams({
    client_id: authConfig.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  const headers = new Headers({ Location: `${GOOGLE_AUTH_URL}?${params}` });
  headers.append("Set-Cookie", buildCookie(STATE_COOKIE, state, 600, "/auth"));
  headers.append("Set-Cookie", buildCookie(VERIFIER_COOKIE, verifier, 600, "/auth"));
  return new Response(null, { status: 302, headers });
}

function redirectToFrontend(query = "", extraCookies: string[] = []): Response {
  const headers = new Headers({ Location: `${authConfig.frontendUrl}/${query}` });
  for (const cookie of extraCookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

// Step 2: Google sends the user back with a one-time code
async function finishLogin(req: Request, url: URL): Promise<Response> {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = getCookie(req, STATE_COOKIE);
  const verifier = getCookie(req, VERIFIER_COOKIE);

  const clearTransient = [
    buildCookie(STATE_COOKIE, "", 0, "/auth"),
    buildCookie(VERIFIER_COOKIE, "", 0, "/auth"),
  ];

  // Also covers the case where the user denied access (no code in the URL)
  if (!code || !state || !savedState || !verifier || state !== savedState) {
    return redirectToFrontend("?login=error", clearTransient);
  }

  // Exchange the code for tokens (server to server, using the client secret)
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: authConfig.clientId,
      client_secret: authConfig.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!tokenResponse.ok) {
    return redirectToFrontend("?login=error", clearTransient);
  }
  const { access_token: accessToken } = await tokenResponse.json();

  // Ask Google who the user is
  const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileResponse.ok) {
    return redirectToFrontend("?login=error", clearTransient);
  }
  const profile = (await profileResponse.json()) as GoogleProfile;
  if (!profile.sub || !profile.email) {
    return redirectToFrontend("?login=error", clearTransient);
  }

  const userId = upsertUser(profile);
  const sessionId = createSession(userId);

  return redirectToFrontend("", [
    buildCookie(SESSION_COOKIE, sessionId, Math.floor(SESSION_MS / 1000)),
    ...clearTransient,
  ]);
}

function currentUser(req: Request, corsHeaders: Record<string, string>): Response {
  const sessionId = getCookie(req, SESSION_COOKIE);
  const user = sessionId ? getUserBySession(sessionId) : null;

  if (!user) {
    return Response.json(
      { error: "Not authenticated" },
      { status: 401, headers: corsHeaders },
    );
  }
  return Response.json(user, { headers: corsHeaders });
}

function logout(req: Request, corsHeaders: Record<string, string>): Response {
  const sessionId = getCookie(req, SESSION_COOKIE);
  if (sessionId) deleteSession(sessionId);

  const headers = new Headers(corsHeaders);
  headers.append("Set-Cookie", buildCookie(SESSION_COOKIE, "", 0));
  return new Response(null, { status: 204, headers });
}