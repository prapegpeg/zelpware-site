import { NextResponse } from "next/server";
import { clearSpotifyCookie, getValidSpotifyToken, isSameOrigin, setSpotifyCookie } from "@/lib/spotify-server";

export async function GET(request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  const result = await getValidSpotifyToken().catch(() => null);
  const response = NextResponse.json({ connected: Boolean(result), configured: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) }, { headers: { "Cache-Control": "no-store" } });
  if (result?.refreshed) setSpotifyCookie(response, result.token, secure);
  if (!result) clearSpotifyCookie(response, secure);
  return response;
}

export async function DELETE(request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  if (!isSameOrigin(request)) return NextResponse.json({ message: "Request origin could not be verified." }, { status: 403 });
  const response = NextResponse.json({ connected: false }, { headers: { "Cache-Control": "no-store" } });
  clearSpotifyCookie(response, secure);
  return response;
}
