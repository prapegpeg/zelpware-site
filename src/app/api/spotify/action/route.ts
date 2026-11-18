import { NextResponse } from "next/server";
import { clearSpotifyCookie, getValidSpotifyToken, isSameOrigin, setSpotifyCookie, spotifyAuthorizationHeader } from "@/lib/spotify-server";

type SpotifyAction = "play" | "pause" | "next" | "previous" | "volume-up" | "volume-down" | "shuffle-on" | "shuffle-off" | "repeat-on" | "repeat-off" | "liked" | "playlist";
const ALLOWED_ACTIONS = new Set<SpotifyAction>(["play", "pause", "next", "previous", "volume-up", "volume-down", "shuffle-on", "shuffle-off", "repeat-on", "repeat-off", "liked", "playlist"]);

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  if (!isSameOrigin(request)) return NextResponse.json({ message: "Request origin could not be verified." }, { status: 403 });
  const result = await getValidSpotifyToken().catch(() => null);
  const cookieResponse = NextResponse.json({ message: "Connect Spotify from Music settings to use playback controls." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (!result) {
    clearSpotifyCookie(cookieResponse, secure);
    return cookieResponse;
  }
  if (result.refreshed) setSpotifyCookie(cookieResponse, result.token, secure);

  let body: { action?: unknown; playlist?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }
  if (typeof body.action !== "string" || !ALLOWED_ACTIONS.has(body.action as SpotifyAction)) {
    return NextResponse.json({ message: "That Spotify control is not supported." }, { status: 400 });
  }

  const action = body.action as SpotifyAction;
  const headers = { ...spotifyAuthorizationHeader(result.token.accessToken), "Content-Type": "application/json" };
  let endpoint: string;
  let method = "PUT";
  let payload: Record<string, unknown> | undefined;

  switch (action) {
    case "play": endpoint = "https://api.spotify.com/v1/me/player/play"; break;
    case "pause": endpoint = "https://api.spotify.com/v1/me/player/pause"; break;
    case "next": endpoint = "https://api.spotify.com/v1/me/player/next"; method = "POST"; break;
    case "previous": endpoint = "https://api.spotify.com/v1/me/player/previous"; method = "POST"; break;
    case "shuffle-on": endpoint = "https://api.spotify.com/v1/me/player/shuffle?state=true"; break;
    case "shuffle-off": endpoint = "https://api.spotify.com/v1/me/player/shuffle?state=false"; break;
    case "repeat-on": endpoint = "https://api.spotify.com/v1/me/player/repeat?state=track"; break;
    case "repeat-off": endpoint = "https://api.spotify.com/v1/me/player/repeat?state=off"; break;
    case "volume-up":
    case "volume-down": {
      const player = await fetch("https://api.spotify.com/v1/me/player", { headers: spotifyAuthorizationHeader(result.token.accessToken), cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!player.ok) return spotifyFailure(player.status);
      const current = await player.json() as { device?: { volume_percent?: number } };
      const volume = current.device?.volume_percent;
      if (typeof volume !== "number") return NextResponse.json({ message: "Spotify did not report a device volume." }, { status: 409 });
      const nextVolume = Math.max(0, Math.min(100, volume + (action === "volume-up" ? 10 : -10)));
      endpoint = `https://api.spotify.com/v1/me/player/volume?volume_percent=${nextVolume}`;
      break;
    }
    case "liked": {
      const savedTracks = await fetch("https://api.spotify.com/v1/me/tracks?limit=50", { headers: spotifyAuthorizationHeader(result.token.accessToken), cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!savedTracks.ok) return spotifyFailure(savedTracks.status);
      const data = await savedTracks.json() as { items?: Array<{ track?: { uri?: string; is_local?: boolean } | null }> };
      const uris = data.items?.map((item) => item.track).filter((track): track is { uri: string; is_local?: boolean } => Boolean(track?.uri && !track.is_local)).map((track) => track.uri).slice(0, 50) ?? [];
      if (!uris.length) return NextResponse.json({ message: "Your saved Spotify tracks are empty." }, { status: 404 });
      endpoint = "https://api.spotify.com/v1/me/player/play";
      payload = { uris };
      break;
    }
    case "playlist": {
      const playlist = typeof body.playlist === "string" ? body.playlist.trim().slice(0, 80) : "";
      if (!playlist) return NextResponse.json({ message: "Include a playlist name, for example “play gym playlist”." }, { status: 400 });
      const searchUrl = new URL("https://api.spotify.com/v1/search");
      searchUrl.search = new URLSearchParams({ q: playlist, type: "playlist", limit: "10" }).toString();
      const search = await fetch(searchUrl, { headers: spotifyAuthorizationHeader(result.token.accessToken), cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!search.ok) return spotifyFailure(search.status);
      const results = await search.json() as { playlists?: { items?: Array<{ name?: string; uri?: string | null }> } };
      const candidates = results.playlists?.items?.filter((item): item is { name: string; uri: string } => Boolean(item.name && item.uri)) ?? [];
      const exact = candidates.find((item) => normalize(item.name) === normalize(playlist));
      if (!exact) {
        const suggestion = candidates[0]?.name;
        return NextResponse.json({ message: suggestion ? `I couldn’t find an exact “${playlist}” playlist. Spotify’s closest result is “${suggestion}”; choose it in Spotify or say its exact name.` : `I couldn’t find a Spotify playlist named “${playlist}”.` }, { status: 404 });
      }
      endpoint = "https://api.spotify.com/v1/me/player/play";
      payload = { context_uri: exact.uri };
      break;
    }
  }

  const spotifyResponse = await fetch(endpoint, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!spotifyResponse.ok) return spotifyFailure(spotifyResponse.status);

  const message: Record<SpotifyAction, string> = {
    play: "Playback resumed.", pause: "Playback paused.", next: "Skipped to the next track.", previous: "Returned to the previous track.",
    "volume-up": "Spotify volume increased.", "volume-down": "Spotify volume decreased.", "shuffle-on": "Shuffle enabled.", "shuffle-off": "Shuffle disabled.",
    "repeat-on": "Track repeat enabled.", "repeat-off": "Repeat disabled.", liked: "Playing your saved tracks.", playlist: "Playing your playlist.",
  };
  return NextResponse.json({ message: message[action] }, { headers: { "Cache-Control": "no-store", "Set-Cookie": cookieResponse.headers.get("Set-Cookie") ?? "" } });
}

function spotifyFailure(status: number) {
  if (status === 401) return NextResponse.json({ message: "Spotify authorization expired. Reconnect your account." }, { status: 401 });
  if (status === 403) return NextResponse.json({ message: "Spotify playback controls require a Premium account and an active playback device." }, { status: 403 });
  if (status === 404) return NextResponse.json({ message: "No active Spotify device was found. Open Spotify on a device and try again." }, { status: 404 });
  if (status === 429) return NextResponse.json({ message: "Spotify is rate limiting requests. Try again shortly." }, { status: 429 });
  return NextResponse.json({ message: "Spotify could not complete that request." }, { status: status >= 400 && status < 600 ? status : 502 });
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
