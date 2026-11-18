import { NextResponse } from "next/server";
import { clearSpotifyCookie, getValidSpotifyToken, setSpotifyCookie, spotifyAuthorizationHeader } from "@/lib/spotify-server";

export async function GET(request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  const result = await getValidSpotifyToken().catch(() => null);
  if (!result) {
    const response = NextResponse.json({ connected: false, playback: null }, { headers: { "Cache-Control": "no-store" } });
    clearSpotifyCookie(response, secure);
    return response;
  }

  const playbackResponse = await fetch("https://api.spotify.com/v1/me/player", {
    headers: spotifyAuthorizationHeader(result.token.accessToken),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const payload = playbackResponse.status === 204
    ? { connected: true, playback: null }
    : playbackResponse.ok
      ? { connected: true, playback: await playbackResponse.json() }
      : { connected: true, playback: null, message: spotifyError(playbackResponse.status) };
  const status = playbackResponse.ok || playbackResponse.status === 204 ? 200 : playbackResponse.status;
  const response = NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
  if (result.refreshed) setSpotifyCookie(response, result.token, secure);
  return response;
}

function spotifyError(status: number) {
  if (status === 401) return "Spotify authorization expired. Reconnect your account.";
  if (status === 403) return "Spotify playback requires Premium and an active device.";
  if (status === 429) return "Spotify is rate limiting requests. Try again shortly.";
  return "Spotify playback is temporarily unavailable.";
}
