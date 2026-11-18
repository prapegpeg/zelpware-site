"use client";

import useSWR from "swr";

type SpotifyTrack = {
  id?: string;
  name?: string;
  uri?: string;
  duration_ms?: number;
  album?: { name?: string; images?: Array<{ url?: string; width?: number; height?: number }> };
  artists?: Array<{ name?: string }>;
};

type SpotifyPlayback = {
  is_playing?: boolean;
  progress_ms?: number;
  item?: SpotifyTrack | null;
  device?: { name?: string; type?: string; volume_percent?: number; is_active?: boolean };
};

type SpotifyStatus = { connected: boolean; playback: SpotifyPlayback | null; message?: string };
const fetcher = async (url: string): Promise<SpotifyStatus> => {
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? "Could not load Spotify playback.");
  return data;
};

export function useSpotifyPlayback() {
  return useSWR<SpotifyStatus>("/api/spotify/status", fetcher, {
    refreshInterval: 8_000,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });
}

export type { SpotifyPlayback, SpotifyTrack, SpotifyStatus };
