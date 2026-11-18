"use client";

import Link from "next/link";
import { COMMANDS } from "@/lib/preferences";
import { useAssistant } from "@/components/assistant-provider";
import { ArrowUpRightIcon, LockIcon, SettingsIcon } from "@/components/interface-icons";

export function PersonalisationPage() {
  const { preferences, updatePreferences, voices, previewVoice, wakeListening, recognitionSupported, micPermission, enableWakeWord, disableWakeWord } = useAssistant();
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div><p className="eyebrow"><span className="eyebrow-line" /> PERSONAL SETTINGS</p><h1>Personalisation<span className="title-period">.</span></h1><p className="page-intro__description">Tune the voice, wake phrase, and assistant presence to your setup.</p></div>
        <div className="intro-symbol"><SettingsIcon /></div>
      </div>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Personalisation sections"><Link className="settings-nav__item settings-nav__item--active" href="/settings/assistant">Voice & appearance<span>01</span></Link><Link className="settings-nav__item" href="/settings/commands">Command library<span>02</span></Link></nav>
        <div className="settings-content">
          <section className="settings-section">
            <div className="settings-section__heading"><div><p className="eyebrow">01 / ACTIVATION</p><h2>Wake phrase</h2><p>Choose the phrase that opens the voice interface.</p></div></div>
            <label className="field-label" htmlFor="wake-phrase">Activation phrase</label>
            <div className="field-inline"><input id="wake-phrase" className="text-input" value={preferences.wakePhrase} maxLength={40} onChange={(event) => updatePreferences({ wakePhrase: event.target.value })} /><span className="field-hint">UP TO 40 CHARACTERS</span></div>
            <div className="setting-callout"><div className="setting-callout__copy"><strong>{wakeListening ? "Wake-word listening is active" : "Wake-word listening is off"}</strong><span>{recognitionSupported ? micPermission === "denied" ? "Allow microphone access in browser settings before starting." : "You control when the microphone is enabled." : "This browser does not support speech recognition."}</span></div><button type="button" className={`button button--small ${wakeListening ? "button--quiet" : "button--primary"}`} onClick={() => wakeListening ? disableWakeWord() : void enableWakeWord()} disabled={!recognitionSupported}>{wakeListening ? "Stop listening" : "Enable wake word"}</button></div>
            <p className="field-footnote">Voice transcription uses your browser&apos;s speech service. This app does not upload microphone audio to its server. iPhone Safari may not support continuous wake-word recognition; use manual activation when needed. Background or locked-screen wake listening is not supported.</p>
          </section>

          <section className="settings-section">
            <div className="settings-section__heading"><div><p className="eyebrow">02 / VOICE</p><h2>Voice profile</h2><p>Available voices depend on your browser and operating system.</p></div><button className="button button--quiet button--small" type="button" onClick={previewVoice}>Test voice</button></div>
            <label className="field-label" htmlFor="voice-profile">Speech voice</label>
            <select id="voice-profile" className="select-input" value={preferences.voiceURI} onChange={(event) => updatePreferences({ voiceURI: event.target.value })}><option value="">System default</option>{voices.map((voice) => <option value={voice.voiceURI} key={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}</select>
            {!voices.length && <p className="field-hint field-hint--below">Your device has not provided a voice list yet. The browser default will be used.</p>}
            <RangeSetting id="speech-rate" label="Speaking rate" value={preferences.speechRate} min={0.65} max={1.2} step={0.05} display={`${preferences.speechRate.toFixed(2)}×`} onChange={(value) => updatePreferences({ speechRate: value })} />
            <RangeSetting id="speech-pitch" label="Pitch" value={preferences.speechPitch} min={0.5} max={1.25} step={0.05} display={preferences.speechPitch < 0.8 ? "LOW" : preferences.speechPitch > 1 ? "HIGH" : "NEUTRAL"} onChange={(value) => updatePreferences({ speechPitch: value })} />
            <RangeSetting id="speech-volume" label="Voice volume" value={preferences.speechVolume} min={0} max={1} step={0.05} display={`${Math.round(preferences.speechVolume * 100)}%`} onChange={(value) => updatePreferences({ speechVolume: value })} />
          </section>

          <section className="settings-section">
            <div className="settings-section__heading"><div><p className="eyebrow">03 / APPEARANCE</p><h2>Orb profile</h2><p>Choose a finish for the assistant&apos;s reactive interface.</p></div></div>
            <div className="orb-options" role="radiogroup" aria-label="Orb appearance">
              {(["titanium", "moonstone", "amber"] as const).map((appearance) => <button key={appearance} type="button" role="radio" aria-checked={preferences.orbAppearance === appearance} className={`orb-option ${preferences.orbAppearance === appearance ? "orb-option--selected" : ""}`} onClick={() => updatePreferences({ orbAppearance: appearance })}><span className={`orb-option__sample orb-option__sample--${appearance}`} /><span><strong>{appearance === "titanium" ? "Titanium" : appearance === "moonstone" ? "Moonstone" : "Amber"}</strong><small>{appearance === "titanium" ? "Cool silver" : appearance === "moonstone" ? "Pale blue" : "Warm signal"}</small></span><span className="radio-indicator" /></button>)}
            </div>
          </section>

          <section className="settings-section settings-section--last">
            <div className="settings-section__heading"><div><p className="eyebrow">04 / BEHAVIOUR</p><h2>Interface behaviour</h2><p>Adjust how the assistant responds on this device.</p></div></div>
            <PreferenceToggle label="Activation tone" description="Play a short tone when the voice channel opens." checked={preferences.activationTone} onChange={(checked) => updatePreferences({ activationTone: checked })} />
            <PreferenceToggle label="Interface animations" description="Animate the orb and active interface states." checked={preferences.animations} onChange={(checked) => updatePreferences({ animations: checked })} />
            <PreferenceToggle label="Silent mode" description="Keep replies on screen without spoken audio." checked={preferences.silentMode} onChange={(checked) => updatePreferences({ silentMode: checked })} />
          </section>
          <div className="settings-footer"><LockIcon /><span>Preferences are stored in this browser only.</span><Link className="text-link" href="/settings/commands">Manage commands <ArrowUpRightIcon /></Link></div>
        </div>
      </div>
    </div>
  );
}

export function CommandSettingsPage() {
  const { preferences, setCommandEnabled, setCommandPhrase } = useAssistant();
  const groups = [...new Set(COMMANDS.map((command) => command.group))];
  const enabledCount = COMMANDS.filter((command) => preferences.commandEnabled[command.id] !== false).length;
  return (
    <div className="page-stack">
      <div className="page-intro"><div><p className="eyebrow"><span className="eyebrow-line" /> PERSONAL SETTINGS</p><h1>Command library<span className="title-period">.</span></h1><p className="page-intro__description">Enable the phrases you use and set a preferred trigger for each command.</p></div><div className="intro-symbol"><SettingsIcon /></div></div>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Personalisation sections"><Link className="settings-nav__item" href="/settings/assistant">Voice & appearance<span>01</span></Link><Link className="settings-nav__item settings-nav__item--active" href="/settings/commands">Command library<span>02</span></Link></nav>
        <div className="settings-content settings-content--commands">
          <div className="command-settings-summary"><div><p className="eyebrow">LOCAL REGISTRY</p><strong>{enabledCount}<small> / {COMMANDS.length} ENABLED</small></strong></div><p>Custom phrases and enablement are saved to this browser.</p></div>
          {groups.map((group) => <section className="command-settings-group" key={group}><div className="catalog-group__head"><h2>{group}</h2><span>{String(COMMANDS.filter((command) => command.group === group).length).padStart(2, "0")} COMMANDS</span></div>{COMMANDS.filter((command) => command.group === group).map((command) => <div className="command-setting-row" key={command.id}><div className="command-setting-row__copy"><div className="command-setting-row__title"><strong>{command.name}</strong><span>{command.description}</span></div><label className="field-label" htmlFor={`phrase-${command.id}`}>Preferred phrase</label><input id={`phrase-${command.id}`} className="text-input" value={preferences.commandPhrases[command.id] ?? command.phrase} onChange={(event) => setCommandPhrase(command.id, event.target.value)} disabled={preferences.commandEnabled[command.id] === false} /></div><PreferenceToggle label="" description="" checked={preferences.commandEnabled[command.id] !== false} onChange={(checked) => setCommandEnabled(command.id, checked)} compact /></div>)}</section>)}
          <div className="settings-footer"><LockIcon /><span>Changes are saved automatically in this browser.</span><Link className="text-link" href="/database">View command database <ArrowUpRightIcon /></Link></div>
        </div>
      </div>
    </div>
  );
}

function RangeSetting({ id, label, value, min, max, step, display, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; display: string; onChange: (value: number) => void }) {
  return <div className="range-setting"><div className="range-setting__header"><label className="field-label" htmlFor={id}>{label}</label><output htmlFor={id}>{display}</output></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}

function PreferenceToggle({ label, description, checked, onChange, compact = false }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void; compact?: boolean }) {
  return <div className={`preference-toggle ${compact ? "preference-toggle--compact" : ""}`}><div className="preference-toggle__copy">{label && <strong>{label}</strong>}{description && <span>{description}</span>}</div><button type="button" role="switch" aria-checked={checked} aria-label={label || "Enable command"} className={`switch ${checked ? "switch--on" : ""}`} onClick={() => onChange(!checked)}><span /></button></div>;
}
