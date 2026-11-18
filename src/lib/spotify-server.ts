import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const SPOTIFY_COOKIE = "batcomputer_spotify";
export const SPOTIFY_SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-library-read",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

export type SpotifyToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export function spotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function encryptToken(token: SpotifyToken) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(token), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptToken(value: string): SpotifyToken | null {
  try {
    const [ivPart, tagPart, encryptedPart] = value.split(".");
    if (!ivPart || !tagPart || !encryptedPart) return null;
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const raw = Buffer.concat([decipher.update(Buffer.from(encryptedPart, "base64url")), decipher.final()]).toString("utf8");
    const token = JSON.parse(raw) as Partial<SpotifyToken>;
    if (typeof token.accessToken !== "string" || typeof token.refreshToken !== "string" || typeof token.expiresAt !== "number") return null;
    return token as SpotifyToken;
  } catch {
    return null;
  }
}

export async function readSpotifyToken() {
  const cookieStore = await cookies();
  const value = cookieStore.get(SPOTIFY_COOKIE)?.value;
  return value ? decryptToken(value) : null;
}

export async function getValidSpotifyToken(): Promise<{ token: SpotifyToken; refreshed: boolean } | null> {
  const token = await readSpotifyToken();
  if (!token) return null;
  if (token.expiresAt > Date.now() + 60_000) return { token, refreshed: false };

  const credentials = spotifyCredentials();
  if (!credentials) return null;
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: token.refreshToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  const refreshed = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!refreshed.access_token || !refreshed.expires_in) return null;
  return {
    refreshed: true,
    token: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || token.refreshToken,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
    },
  };
}

export function setSpotifyCookie(response: Response, token: SpotifyToken, secure: boolean) {
  const cookie = `${SPOTIFY_COOKIE}=${encryptToken(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secure ? "; Secure" : ""}`;
  response.headers.append("Set-Cookie", cookie);
}

export function clearSpotifyCookie(response: Response, secure: boolean) {
  response.headers.append("Set-Cookie", `${SPOTIFY_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`);
}

export function spotifyAuthorizationHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function getEncryptionKey() {
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!secret) throw new Error("Spotify credentials are not configured.");
  return createHash("sha256").update(`batcomputer-spotify-cookie-v1:${secret}`).digest();
}

export function newOAuthState() {
  return randomBytes(24).toString("base64url");
}
