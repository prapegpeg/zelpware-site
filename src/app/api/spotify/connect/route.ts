import { NextResponse } from "next/server";
import { newOAuthState, SPOTIFY_SCOPES, spotifyCredentials } from "@/lib/spotify-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const credentials = spotifyCredentials();
  if (!credentials) return NextResponse.redirect(new URL("/music?spotify=setup-required", url.origin));

  const state = newOAuthState();
  const redirectUri = new URL("/api/spotify/callback", url.origin).toString();
  const authorizationUrl = new URL("https://accounts.spotify.com/authorize");
  authorizationUrl.search = new URLSearchParams({
    client_id: credentials.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    state,
    show_dialog: "true",
  }).toString();

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set("batcomputer_spotify_state", state, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/api/spotify/callback",
    maxAge: 600,
  });
  return response;
}
