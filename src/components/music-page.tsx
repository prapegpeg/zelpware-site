"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { useAssistant } from "@/components/assistant-provider";
import { ArrowUpRightIcon, MusicIcon } from "@/components/interface-icons";
import { useSpotifyPlayback } from "@/components/use-spotify-playback";

type SpotifyConnection = { connected: boolean; configured: boolean };
const fetchConnection = async (url: string): Promise<SpotifyConnection> => {
  const response = await fetch(url, { cache: "no-store" });
  return response.json();
};

export function MusicPage() {
  const { spotifyConnected } = useAssistant();
  const { data: connection, mutate: mutateConnection } = useSWR<SpotifyConnection>("/api/spotify/session", fetchConnection, { revalidateOnFocus: true, shouldRetryOnError: false });
  const { data: status, error, mutate: mutatePlayback } = useSpotifyPlayback();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [callbackState, setCallbackState] = useState("");
  const [callbackUri, setCallbackUri] = useState("/api/spotify/callback");

  useEffect(() => {
    queueMicrotask(() => setCallbackUri(`${window.location.origin}/api/spotify/callback`));
    const value = new URLSearchParams(window.location.search).get("spotify");
    if (value) {
      queueMicrotask(() => setCallbackState(value));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function perform(action: string) {
    setBusy(action);
    setNotice("");
    try {
      const response = await fetch("/api/spotify/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const result = await response.json();
      setNotice(result.message ?? "Spotify updated.");
      if (response.ok) await mutatePlayback();
      else if (response.status === 401) await mutateConnection();
    } catch {
      setNotice("Could not reach Spotify. Try again when you are back online.");
    } finally {
      setBusy("");
    }
  }

  async function disconnect() {
    setBusy("disconnect");
    try {
      await fetch("/api/spotify/session", { method: "DELETE" });
      await Promise.all([mutateConnection({ connected: false, configured: Boolean(connection?.configured) }), mutatePlayback()]);
      setNotice("Spotify disconnected from this browser.");
    } catch {
      setNotice("Could not disconnect Spotify. Try again.");
    } finally {
      setBusy("");
    }
  }

  const playback = status?.playback;
  const track = playback?.item;
  const albumImage = track?.album?.images?.[0]?.url;
  const artists = track?.artists?.map((artist) => artist.name).filter(Boolean).join(", ");
  const connected = Boolean(connection?.connected || spotifyConnected);

  return (
    <div className="page-stack music-page">
      <div className="page-intro"><div><p className="eyebrow"><span className="eyebrow-line" /> EXTERNAL AUDIO / SPOTIFY</p><h1>Music controls<span className="title-period">.</span></h1><p className="page-intro__description">Control playback on your active Spotify device.</p></div><div className="intro-symbol intro-symbol--music"><MusicIcon /></div></div>
      {callbackState === "connected" && <div className="inline-notice inline-notice--success" role="status">Spotify is connected. Playback controls are ready.</div>}
      {(callbackState === "connection-failed" || callbackState === "cancelled") && <div className="inline-notice" role="status">Spotify connection was not completed. Check your app credentials and callback URL, then try again.</div>}
      {callbackState === "setup-required" && <div className="inline-notice" role="status">Add your Spotify app credentials in project environment variables before connecting.</div>}

      {!connection?.configured && !connected ? <section className="spotify-connect-panel">
        <div className="spotify-connect-panel__art"><div className="record-groove"><span /><span /><span /></div><div className="record-label"><MusicIcon /></div></div>
        <div className="spotify-connect-panel__copy"><p className="eyebrow">LINK YOUR PLAYER</p><h2>Bring your music<br />into the room.</h2><p>Connect Spotify to control playback, play saved tracks, and request a playlist by name. Your account tokens are encrypted in a server-only cookie and never exposed to page scripts.</p>
          <div className="setup-steps"><div><span>01</span><p>Create an app in the <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">Spotify Developer Dashboard <ArrowUpRightIcon /></a></p></div><div><span>02</span><p>Add this callback URL to its allowlist:<code>{callbackUri}</code></p></div><div><span>03</span><p>Set <code>SPOTIFY_CLIENT_ID</code> and <code>SPOTIFY_CLIENT_SECRET</code> in this project&apos;s environment variables.</p></div></div>
          <button className="button button--primary" type="button" disabled>Connect Spotify <ArrowUpRightIcon /></button>
          <p className="button-hint">The connect action becomes available once credentials are configured.</p>
        </div>
      </section> : !connected ? <section className="spotify-ready-panel"><div className="spotify-ready-panel__icon"><MusicIcon /></div><div><p className="eyebrow">SPOTIFY DEVELOPER APP READY</p><h2>Connect your account.</h2><p>Authorise this browser to control an active Spotify playback device.</p></div><a className="button button--primary" href="/api/spotify/connect">Connect Spotify <ArrowUpRightIcon /></a></section> : <>
        <section className="spotify-player-card">
          <div className="spotify-player-card__top"><div className="player-status"><span className="status-led status-led--online" />SPOTIFY CONNECTED</div><button className="text-button" type="button" onClick={() => void disconnect()} disabled={busy === "disconnect"}>{busy === "disconnect" ? "Disconnecting…" : "Disconnect"}</button></div>
          <div className="now-playing">
            {albumImage ? <Image className="now-playing__art" src={albumImage} alt={track?.album?.name ? `Album artwork for ${track.album.name}` : "Spotify album artwork"} width={125} height={125} unoptimized /> : <div className="now-playing__art now-playing__art--empty"><MusicIcon /></div>}
            <div className="now-playing__details"><span className="eyebrow">NOW PLAYING</span><h2>{track?.name ?? (error ? "Playback unavailable" : "Nothing playing right now")}</h2><p>{artists ?? (playback?.device?.name ? `Ready on ${playback.device.name}` : "Open Spotify on a device to begin.")}</p><div className="player-progress"><div className="player-progress__bar"><span style={{ width: `${playback?.item && playback.progress_ms ? Math.min(100, playback.progress_ms / 3000) : 0}%` }} /></div><div className="player-progress__times"><span>{formatTime(playback?.progress_ms ?? 0)}</span><span>{formatTime(track?.duration_ms ?? 0)}</span></div></div></div>
          </div>
          {notice && <p className="player-notice" role="status">{notice}</p>}
          {error?.message && <p className="player-notice" role="status">{error.message}</p>}
          <div className="player-controls" aria-label="Spotify playback controls"><button type="button" className="player-control player-control--text" onClick={() => void perform("previous")} disabled={Boolean(busy)} aria-label="Previous track">PREV</button><button type="button" className="player-control player-control--play" onClick={() => void perform(playback?.is_playing ? "pause" : "play")} disabled={Boolean(busy)} aria-label={playback?.is_playing ? "Pause playback" : "Resume playback"}>{playback?.is_playing ? "PAUSE" : "PLAY"}</button><button type="button" className="player-control player-control--text" onClick={() => void perform("next")} disabled={Boolean(busy)} aria-label="Next track">NEXT</button></div>
          <div className="player-extra-controls"><button type="button" onClick={() => void perform("liked")} disabled={Boolean(busy)}>Play saved tracks</button><button type="button" onClick={() => void perform("shuffle-on")} disabled={Boolean(busy)}>Enable shuffle</button><button type="button" onClick={() => void perform("repeat-on")} disabled={Boolean(busy)}>Repeat track</button></div>
          {playback?.device?.name && <p className="active-device">ACTIVE DEVICE <strong>{playback.device.name}</strong><span>{playback.device.type ?? "Spotify device"}</span></p>}
        </section>
        <section className="music-voice-note"><span className="music-voice-note__mark">B</span><div><p className="eyebrow">VOICE SHORTCUTS</p><p>Try “play my liked songs”, “next track”, “volume up”, or “play gym playlist”.</p></div><Link className="text-link" href="/settings/commands">Command library <ArrowUpRightIcon /></Link></section>
      </>}
      <div className="music-disclaimer"><span className="eyebrow">PLAYBACK NOTE</span><p>Playback commands require an active Spotify device. Some playback controls require Spotify Premium and may depend on the account&apos;s market and current Spotify API access.</p></div>
    </div>
  );
}

function formatTime(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1000).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
