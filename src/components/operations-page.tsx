"use client";

import Link from "next/link";
import { useAssistant } from "@/components/assistant-provider";
import { ArrowUpRightIcon, LockIcon, PulseIcon } from "@/components/interface-icons";

export function OperationsPage() {
  const { recognitionSupported, speechSupported, micPermission, wakeListening, spotifyConnected, preferences, enableWakeWord, disableWakeWord, activateManually } = useAssistant();
  const rows = [
    { name: "Speech recognition", detail: "Browser-native voice input", state: recognitionSupported ? "Ready" : "Unavailable", tone: recognitionSupported ? "online" : "limited" },
    { name: "Microphone permission", detail: "Permission is requested only after you enable listening", state: micPermission === "granted" ? "Granted" : micPermission === "denied" ? "Denied" : micPermission === "unsupported" ? "Unsupported" : "Not requested", tone: micPermission === "granted" ? "online" : micPermission === "denied" ? "limited" : "idle" },
    { name: "Speech synthesis", detail: "Voice selection and tuning are handled by your browser", state: speechSupported ? "Ready" : "Unavailable", tone: speechSupported ? "online" : "limited" },
    { name: "Spotify connection", detail: "Server-side encrypted session", state: spotifyConnected ? "Connected" : "Not connected", tone: spotifyConnected ? "online" : "idle" },
  ];
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div><p className="eyebrow"><span className="eyebrow-line" /> SYSTEM DIAGNOSTICS</p><h1>Operations<span className="title-period">.</span></h1><p className="page-intro__description">Live status from this browser. No simulated telemetry.</p></div>
        <div className="intro-symbol"><PulseIcon /></div>
      </div>
      <section className="operations-banner"><div><span className="status-led status-led--online" /><span className="eyebrow">CORE INTERFACE</span><h2>{recognitionSupported && speechSupported ? "Ready for your command." : "Some voice features are unavailable."}</h2><p>Speech capability depends on the browser and device you are using.</p></div><button className="button button--primary" type="button" onClick={() => void activateManually()}>Test voice channel</button></section>
      <section className="operations-list" aria-label="Live diagnostics">
        <div className="operations-list__head"><span>SUBSYSTEM</span><span>STATUS</span></div>
        {rows.map((row, index) => <div className="operation-row" key={row.name}><div className="operation-row__number">0{index + 1}</div><div className="operation-row__name"><strong>{row.name}</strong><small>{row.detail}</small></div><span className={`operation-status operation-status--${row.tone}`}><span />{row.state}</span></div>)}
      </section>
      <section className="wake-card"><div className="wake-card__icon"><LockIcon /></div><div className="wake-card__copy"><p className="eyebrow">WAKE-WORD CHANNEL</p><h2>{wakeListening ? `Listening for “${preferences.wakePhrase}”.` : "Listening is opt-in."}</h2><p>When enabled, the browser keeps the microphone active to detect your wake phrase. Transcription is handled by the browser’s speech service.</p></div><button className={`button ${wakeListening ? "button--quiet" : "button--primary"}`} type="button" onClick={() => wakeListening ? disableWakeWord() : void enableWakeWord()}>{wakeListening ? "Stop listening" : "Enable listening"}</button></section>
      <div className="inline-links"><Link href="/settings/assistant" className="text-link">Voice preferences <ArrowUpRightIcon /></Link><Link href="/music" className="text-link">Spotify setup <ArrowUpRightIcon /></Link></div>
    </div>
  );
}
