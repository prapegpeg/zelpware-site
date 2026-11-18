import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { setSpotifyCookie, spotifyCredentials, type SpotifyToken } from "@/lib/spotify-server"

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = new URL("/music", url.origin);
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("batcomputer_spotify_state")?.value;
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const credentials = spotifyCredentials();
  const clearState = () => ({ name: "batcomputer_spotify_state", value: "", options: { httpOnly: true, secure: url.protocol === "https:", sameSite: "lax" as const, path: "/api/spotify/callback", maxAge: 0 } });

  if (url.searchParams.has("error")) {
    destination.searchParams.set("spotify", "cancelled");
    const response = NextResponse.redirect(destination);
    response.cookies.set(clearState().name, clearState().value, clearState().options);
    return response;
  }
  if (!credentials || !code || !state || !expectedState || state !== expectedState) {
    destination.searchParams.set("spotify", "connection-failed");
    const response = NextResponse.redirect(destination);
    response.cookies.set(clearState().name, clearState().value, clearState().options);
    return response;
  }

  const redirectUri = new URL("/api/spotify/callback", url.origin).toString();
  const exchange = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!exchange.ok) {
    destination.searchParams.set("spotify", "connection-failed");
    const response = NextResponse.redirect(destination);
    response.cookies.set(clearState().name, clearState().value, clearState().options);
    return response;
  }

  const result = await exchange.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!result.access_token || !result.refresh_token || !result.expires_in) {
    destination.searchParams.set("spotify", "connection-failed");
    const response = NextResponse.redirect(destination);
    response.cookies.set(clearState().name, clearState().value, clearState().options);
    return response;
  }

  const token: SpotifyToken = {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresAt: Date.now() + result.expires_in * 1000,
  };
  const response = NextResponse.redirect(new URL("/music?spotify=connected", url.origin));
  setSpotifyCookie(response, token, url.protocol === "https:");
  response.cookies.set(clearState().name, clearState().value, clearState().options);
  return response;
}
