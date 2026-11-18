"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAssistant } from "@/components/assistant-provider";
import { ArrowUpRightIcon, ClockIcon, DatabaseIcon, MusicIcon, PulseIcon } from "@/components/interface-icons";
import { useSpotifyPlayback } from "@/components/use-spotify-playback";

export function DashboardPage() {
  const { activateManually, preferences, wakeListening, recognitionSupported, speechSupported, spotifyConnected } = useAssistant();
  const { data: playbackStatus } = useSpotifyPlayback();
  const [now, setNow] = useState<Date | null>(null);
  const [greeting, setGreeting] = useState("Good evening");

  useEffect(() => {
    const update = () => {
      const date = new Date();
      setNow(date);
      const hour = date.getHours();
      setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
    };
    update();
    const interval = window.setInterval(update, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const dateLabel = now ? new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "2-digit" }).format(now) : "—";
  const localTime = now ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }).format(now) : "—";
  const timeZone = now ? new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(now).find((part) => part.type === "timeZoneName")?.value ?? "LOCAL" : "LOCAL";

  const systems = [
    { name: "Voice recognition", value: recognitionSupported ? "Available" : "Not supported", detail: wakeListening ? "Wake phrase active" : "Manual activation", state: recognitionSupported ? "online" : "limited" },
    { name: "Speech output", value: speechSupported ? "Available" : "Not supported", detail: preferences.silentMode ? "Silent mode" : "Browser voice engine", state: speechSupported ? "online" : "limited" },
    { name: "Spotify link", value: spotifyConnected ? "Connected" : "Not connected", detail: spotifyConnected ? playbackStatus?.playback?.device?.name ?? "Playback ready" : "Setup in Music controls", state: spotifyConnected ? "online" : "idle" },
  ];

  return (
    <div className="page-stack dashboard-page">
      <div className="page-intro dashboard-intro">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> GOTHAM CITY / SECURE CHANNEL</p>
          <h1>{greeting}<span className="title-period">.</span></h1>
          <p className="page-intro__description">All systems are standing by. What do you need?</p>
        </div>
        <div className="date-readout"><ClockIcon /><span><strong>{dateLabel}</strong><small>LOCAL TIME / {localTime}</small></span></div>
      </div>

      <section className="command-hero" aria-labelledby="command-hero-title">
        <div className="command-hero__texture" />
        <div className="command-hero__content">
          <div className="hero-kicker"><span className="hero-kicker__line" /> PERSONAL ASSISTANT / ONLINE</div>
          <h2 id="command-hero-title">The city never<br />stands still.</h2>
          <p>Voice commands, system status, and music controls. Your command library stays in this browser.</p>
          <button className="button button--primary" type="button" onClick={() => void activateManually()}>
            <span className="button-radar" /> Activate assistant <span className="button-shortcut">↵</span>
          </button>
          <div className="hero-meta"><span className={`status-led ${wakeListening ? "status-led--active" : ""}`} />{wakeListening ? `WAKE WORD ACTIVE · “${preferences.wakePhrase.toUpperCase()}”` : "VOICE CHANNEL READY WHEN YOU ARE"}</div>
        </div>
        <div className="command-hero__orb" aria-hidden="true"><div className="orb-grid" /><div className="hero-orb-glow" /><div className="hero-orb"><span /><span /><span /></div><span className="orb-label">B / 01</span></div>
        <div className="command-hero__index">01 <span>/</span> 04</div>
      </section>

      <div className="section-heading section-heading--row">
        <div><p className="eyebrow">SYSTEM OVERVIEW</p><h2>At a glance</h2></div>
        <Link href="/operations" className="text-link">View all systems <ArrowUpRightIcon /></Link>
      </div>
      <section className="system-grid" aria-label="System status">
        {systems.map((system) => <article className="system-card" key={system.name}>
          <div className="system-card__top"><span className={`status-led status-led--${system.state}`} /><span>{system.name.toUpperCase()}</span><span className="system-card__dots">•••</span></div>
          <strong className="system-card__value">{system.value}</strong>
          <p>{system.detail}</p>
          <div className="system-card__bottom"><span>STATUS</span><span className={`status-word status-word--${system.state}`}>{system.state === "online" ? "NOMINAL" : system.state === "limited" ? "LIMITED" : "STANDBY"}</span></div>
        </article>)}
      </section>

      <div className="dashboard-lower-grid">
        <section className="quick-actions-panel" aria-labelledby="quick-actions-title">
          <div className="panel-heading"><div><p className="eyebrow">DIRECT ACCESS</p><h2 id="quick-actions-title">Quick actions</h2></div><span className="panel-index">A—04</span></div>
          <div className="quick-action-list">
            <Link href="/operations" className="quick-action"><span className="quick-action__icon"><PulseIcon /></span><span><strong>System operations</strong><small>Voice and browser diagnostics</small></span><ArrowUpRightIcon /></Link>
            <Link href="/database" className="quick-action"><span className="quick-action__icon"><DatabaseIcon /></span><span><strong>Command database</strong><small>Browse available voice phrases</small></span><ArrowUpRightIcon /></Link>
            <Link href="/music" className="quick-action"><span className="quick-action__icon"><MusicIcon /></span><span><strong>Music controls</strong><small>{spotifyConnected ? playbackStatus?.playback?.item?.name ?? "Spotify connected" : "Connect your Spotify account"}</small></span><ArrowUpRightIcon /></Link>
          </div>
        </section>
        <aside className="privacy-panel">
          <div className="privacy-panel__mark"><span /><span /><span /></div>
          <p className="eyebrow">LOCAL BY DESIGN</p>
          <h2>Your settings<br />stay yours.</h2>
          <p>Voice preferences and command customisations are stored in this browser. Spotify tokens are encrypted and never exposed to page scripts.</p>
          <Link href="/settings/assistant" className="text-link">Review personalisation <ArrowUpRightIcon /></Link>
        </aside>
      </div>
      <div className="dashboard-footnote"><span>BATCOMPUTER / BUILD 01</span><span>LOCAL DEVICE TIME <span className="footnote-divider">—</span> {timeZone}</span></div>
    </div>
  );
}
