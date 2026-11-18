"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AssistantOrb } from "@/components/assistant-orb";
import { useAssistant } from "@/components/assistant-provider";
import { DatabaseIcon, GridIcon, MusicIcon, PulseIcon, SettingsIcon, SystemMark } from "@/components/interface-icons";

const NAVIGATION = [
  { label: "Overview", href: "/", icon: GridIcon },
  { label: "Operations", href: "/operations", icon: PulseIcon },
  { label: "Command database", href: "/database", icon: DatabaseIcon },
  { label: "Music controls", href: "/music", icon: MusicIcon },
  { label: "Personalisation", href: "/settings/assistant", icon: SettingsIcon },
];

const PAGE_NAMES: Record<string, string> = {
  "/": "Overview",
  "/operations": "Operations",
  "/database": "Command database",
  "/music": "Music controls",
  "/settings/assistant": "Personalisation",
  "/settings/commands": "Command settings",
};

export function BatcomputerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { preferences, phase, wakeListening, activateManually } = useAssistant();
  const [clock, setClock] = useState("--:--");
  const pageName = PAGE_NAMES[pathname] ?? "Batcomputer";

  useEffect(() => {
    const updateClock = () => setClock(new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    updateClock();
    const interval = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <Link className="brand-lockup" href="/" aria-label="Batcomputer home">
          <span className="brand-mark"><SystemMark /></span>
          <span className="brand-copy"><strong>BATCOMPUTER</strong><small>WAYNE SYSTEMS / 04</small></span>
        </Link>
        <div className="nav-section-label">WORKSPACE</div>
        <nav className="primary-nav">
          {NAVIGATION.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className={`nav-item ${active ? "nav-item--active" : ""}`} aria-label={label} aria-current={active ? "page" : undefined}>
                <Icon className="nav-icon" />
                <span>{label}</span>
                {active && <span className="nav-active-mark" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-console">
          <div className="sidebar-console__orb"><AssistantOrb phase={phase} appearance={preferences.orbAppearance} animations={preferences.animations} compact /></div>
          <div className="sidebar-console__copy">
            <span className="eyebrow">VOICE CHANNEL</span>
            <strong>{wakeListening ? "Listening" : phase === "speaking" ? "Responding" : "Standby"}</strong>
          </div>
          <span className={`signal-dot ${wakeListening ? "signal-dot--live" : ""}`} />
          <button className="sidebar-console__activate" type="button" onClick={() => void activateManually()} aria-label="Activate voice assistant" />
        </div>
        <div className="sidebar-footer"><span>SECURE LOCAL SESSION</span><span className="footer-lock"><span /> SESSION ENCRYPTED</span></div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb"><span>GOTHAM</span><span className="breadcrumb-slash">/</span><span>{pageName.toUpperCase()}</span></div>
          <div className="topbar__right">
            <span className="topbar-clock">{clock} <span>LOCAL</span></span>
            <span className="topbar-separator" />
            <button className="topbar-voice-button" type="button" onClick={() => void activateManually()}><span className="topbar-voice-dot" /> ACTIVATE VOICE</button>
          </div>
        </header>
        <main className="main-content">{children}</main>
        <footer className="mobile-footer"><span>WAYNE SYSTEMS / 04</span><span className="mobile-footer__status"><span /> LOCAL SESSION</span></footer>
      </div>
    </div>
  );
}
