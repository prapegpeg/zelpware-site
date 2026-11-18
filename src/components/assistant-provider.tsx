"use client";

import { createContext, FormEvent, KeyboardEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AssistantOrb } from "@/components/assistant-orb";
import { matchCommand, normalizeCommand, stripWakePhrase } from "@/lib/commands";
import { DEFAULT_PREFERENCES, sanitizePreferences, type AssistantPreferences } from "@/lib/preferences";

type Phase = "idle" | "listening" | "thinking" | "speaking";
type RecognitionMode = "wake" | "command" | null;
type SpotifySession = { connected: boolean; configured?: boolean };
type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = Event & { resultIndex: number; results: ArrayLike<SpeechResult> };
type RecognitionErrorEvent = Event & { error: string };
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
  webkitAudioContext?: typeof AudioContext;
};
type AssistantContextValue = {
  preferences: AssistantPreferences;
  voices: SpeechSynthesisVoice[];
  phase: Phase;
  audioLevel: number;
  wakeListening: boolean;
  recognitionSupported: boolean;
  speechSupported: boolean;
  micPermission: "unknown" | "granted" | "denied" | "unsupported";
  overlayOpen: boolean;
  transcript: string;
  response: string;
  spotifyConnected: boolean;
  updatePreferences: (updates: Partial<AssistantPreferences>) => void;
  setCommandEnabled: (id: string, enabled: boolean) => void;
  setCommandPhrase: (id: string, phrase: string) => void;
  enableWakeWord: () => Promise<void>;
  disableWakeWord: () => void;
  activateManually: () => Promise<void>;
  closeAssistant: () => void;
  submitCommand: (value: string) => Promise<void>;
  previewVoice: () => void;
  openMusicSettings: () => void;
};

const PREFERENCES_KEY = "batcomputer.preferences.v1";
const fetcher = async (url: string): Promise<SpotifySession> => {
  const response = await fetch(url, { cache: "no-store" });
  return response.json();
};
const AssistantContext = createContext<AssistantContextValue | null>(null);
const EMPTY_VOICES: SpeechSynthesisVoice[] = [];
let voiceSnapshot = EMPTY_VOICES;
const subscribeToBrowserSupport = () => () => {};
const getRecognitionSupport = () => typeof window !== "undefined" && Boolean((window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition);
const getSpeechSupport = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
const subscribeToVoices = (notify: () => void) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return () => {};
  const update = () => { voiceSnapshot = window.speechSynthesis.getVoices(); notify(); };
  window.speechSynthesis.addEventListener("voiceschanged", update);
  update();
  return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
};
const getVoicesSnapshot = () => voiceSnapshot;

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) throw new Error("useAssistant must be used inside AssistantProvider.");
  return context;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);
  const voices = useSyncExternalStore(subscribeToVoices, getVoicesSnapshot, () => EMPTY_VOICES);
  const recognitionSupported = useSyncExternalStore(subscribeToBrowserSupport, getRecognitionSupport, () => false);
  const speechSupported = useSyncExternalStore(subscribeToBrowserSupport, getSpeechSupport, () => false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [wakeListening, setWakeListening] = useState(false);
  const [micPermission, setMicPermission] = useState<AssistantContextValue["micPermission"]>("unknown");
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("Standing by.");
  const recognitionRef = useRef<Recognition | null>(null);
  const modeRef = useRef<RecognitionMode>(null);
  const preferencesRef = useRef(preferences);
  const wakeEnabledRef = useRef(false);
  const recognitionRunningRef = useRef(false);
  const commandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);
  const speakingRef = useRef(false);
  const lastResponseRef = useRef("Standing by.");
  const runCommandRef = useRef<(spoken: string) => Promise<void>>(async () => {});
  const startRecognitionRef = useRef<(mode: Exclude<RecognitionMode, null>) => Promise<boolean>>(async () => false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: spotifySession } = useSWR<SpotifySession>("/api/spotify/session", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });
  const spotifyConnected = Boolean(spotifySession?.connected);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(PREFERENCES_KEY);
        if (stored) setPreferences(sanitizePreferences(JSON.parse(stored)));
      } catch {
        setPreferences(DEFAULT_PREFERENCES);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    preferencesRef.current = preferences;
    wakeEnabledRef.current = preferences.wakeWordEnabled;
  }, [preferences, hydrated]);

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    const RecognitionConstructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!RecognitionConstructor) return;

    const recognition = new RecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result?.isFinal) continue;
        const spoken = result[0]?.transcript?.trim();
        if (!spoken) continue;
        if (modeRef.current === "wake") {
          const currentPreferences = preferencesRef.current;
          const normalized = normalizeCommand(spoken);
          const wakePhrase = normalizeCommand(currentPreferences.wakePhrase);
          if (wakePhrase && normalized.startsWith(wakePhrase)) {
            const commandText = stripWakePhrase(spoken, currentPreferences.wakePhrase);
            modeRef.current = commandText ? null : "command";
            if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
            if (!commandText) commandTimeoutRef.current = setTimeout(() => {
              if (modeRef.current === "command" && !processingRef.current) {
                modeRef.current = "wake";
                setPhase("idle");
                setResponse(`Still listening for “${currentPreferences.wakePhrase}”.`);
                if (!recognitionRunningRef.current) void startRecognitionRef.current("wake");
              }
            }, 8000);
            setOverlayOpen(true);
            setTranscript(commandText);
            setPhase("listening");
            playActivationTone(currentPreferences.activationTone);
            if (commandText) void runCommandRef.current(commandText);
          }
          continue;
        }
        if (modeRef.current === "command") {
          setTranscript(spoken);
          void runCommandRef.current(spoken);
          return;
        }
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicPermission("denied");
        setWakeListening(false);
        wakeEnabledRef.current = false;
        setPreferences((current) => ({ ...current, wakeWordEnabled: false }));
        setResponse("Microphone access was denied. Allow microphone access in your browser settings, then try again.");
        setPhase("idle");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setResponse("Voice recognition stopped unexpectedly. You can still enter a command below.");
        setPhase("idle");
      }
    };
    recognition.onend = () => {
      recognitionRunningRef.current = false;
      if (modeRef.current === "command" && wakeEnabledRef.current && !speakingRef.current && !processingRef.current) {
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => void startRecognitionRef.current("command"), 350);
        return;
      }
      if (wakeEnabledRef.current && !speakingRef.current && !processingRef.current) {
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => void startRecognitionRef.current("wake"), 350);
      } else if (!wakeEnabledRef.current && !processingRef.current && !speakingRef.current) {
        modeRef.current = null;
        setPhase((current) => current === "listening" ? "idle" : current);
        stopAudioCapture();
      }
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.stop(); } catch { /* Recognition may not have started. */ }
      recognitionRef.current = null;
      stopAudioCapture();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const startRecognition = useCallback(async (mode: Exclude<RecognitionMode, null>) => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setResponse("Speech recognition is not supported in this browser. Use the command field below.");
      setPhase("idle");
      return false;
    }
    if (recognitionRunningRef.current) {
      modeRef.current = mode;
      recognition.continuous = mode === "wake";
      if (mode === "wake") setWakeListening(true);
      setPhase("listening");
      return true;
    }
    const hasMic = await startAudioCapture();
    if (!hasMic) {
      setMicPermission("mediaDevices" in navigator ? "denied" : "unsupported");
      setResponse("Microphone access is unavailable. Check browser permissions or type a command instead.");
      setPhase("idle");
      return false;
    }
    setMicPermission("granted");
    modeRef.current = mode;
    recognition.continuous = mode === "wake";
    recognition.interimResults = false;
    try {
      recognition.start();
      recognitionRunningRef.current = true;
      if (mode === "wake") setWakeListening(true);
      setPhase("listening");
      setResponse(mode === "wake" ? `Listening for “${preferencesRef.current.wakePhrase}”.` : "Listening for a command.");
      return true;
    } catch {
      recognitionRunningRef.current = false;
      setResponse("Voice recognition could not start. Check your browser microphone permission and try again.");
      setWakeListening(false);
      setPhase("idle");
      return false;
    }
  }, []);

  useEffect(() => { startRecognitionRef.current = startRecognition; }, [startRecognition]);
  useEffect(() => { activeLevelCallback = setAudioLevel; return () => { if (activeLevelCallback === setAudioLevel) activeLevelCallback = null; }; }, []);

  useEffect(() => {
    if (!hydrated || !preferences.wakeWordEnabled || !recognitionSupported) return;
    let cancelled = false;
    const resumeIfAlreadyGranted = async () => {
      try {
        const permission = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (permission.state === "granted" && !cancelled) {
          setMicPermission("granted");
          await startRecognition("wake");
        }
      } catch {
        setResponse("Wake word is enabled. Tap Start listening to resume microphone access in this browser.");
      }
    };
    void resumeIfAlreadyGranted();
    return () => { cancelled = true; };
  }, [hydrated, preferences.wakeWordEnabled, recognitionSupported, startRecognition]);

  const updatePreferences = useCallback((updates: Partial<AssistantPreferences>) => {
    setPreferences((current) => ({ ...current, ...updates }));
  }, []);

  const setCommandEnabled = useCallback((id: string, enabled: boolean) => {
    setPreferences((current) => ({ ...current, commandEnabled: { ...current.commandEnabled, [id]: enabled } }));
  }, []);

  const setCommandPhrase = useCallback((id: string, phrase: string) => {
    setPreferences((current) => ({ ...current, commandPhrases: { ...current.commandPhrases, [id]: phrase.slice(0, 80) } }));
  }, []);

  const disableWakeWord = useCallback(() => {
    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    wakeEnabledRef.current = false;
    setWakeListening(false);
    setPreferences((current) => ({ ...current, wakeWordEnabled: false }));
    modeRef.current = null;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    try { recognitionRef.current?.stop(); } catch { /* Recognition may already be stopped. */ }
    stopAudioCapture();
  }, []);

  const enableWakeWord = useCallback(async () => {
    if (!recognitionSupported) {
      setResponse("Wake-word listening is not supported in this browser. Manual command entry remains available.");
      return;
    }
    setPreferences((current) => ({ ...current, wakeWordEnabled: true }));
    wakeEnabledRef.current = true;
    setOverlayOpen(false);
    const started = await startRecognition("wake");
    if (!started) disableWakeWord();
  }, [recognitionSupported, startRecognition, disableWakeWord]);

  const speak = useCallback((text: string, remember = true) => {
    setResponse(text);
    if (remember) lastResponseRef.current = text;
    if (preferences.silentMode || !("speechSynthesis" in window)) {
      speakingRef.current = false;
      setPhase("idle");
      if (wakeEnabledRef.current) void startRecognition("wake");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = preferences.speechRate;
    utterance.pitch = preferences.speechPitch;
    utterance.volume = preferences.speechVolume;
    const chosenVoice = voices.find((voice) => voice.voiceURI === preferences.voiceURI);
    if (chosenVoice) utterance.voice = chosenVoice;
    speakingRef.current = true;
    utterance.onstart = () => setPhase("speaking");
    utterance.onend = () => {
      speakingRef.current = false;
      setPhase("idle");
      if (wakeEnabledRef.current) void startRecognition("wake");
      else stopAudioCapture();
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      setPhase("idle");
      if (wakeEnabledRef.current) void startRecognition("wake");
      else stopAudioCapture();
    };
    window.speechSynthesis.speak(utterance);
  }, [preferences.silentMode, preferences.speechRate, preferences.speechPitch, preferences.speechVolume, preferences.voiceURI, voices, startRecognition]);

  const performSpotifyAction = useCallback(async (action: string, playlist?: string) => {
    const result = await fetch("/api/spotify/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, playlist }),
    });
    const data = await result.json().catch(() => ({})) as { message?: string };
    return data.message ?? (result.ok ? "Spotify updated." : "Spotify could not complete that action.");
  }, []);

  const runCommand = useCallback(async (spoken: string) => {
    if (processingRef.current) return;
    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    processingRef.current = true;
    setPhase("thinking");
    modeRef.current = null;
    try { recognitionRef.current?.stop(); } catch { /* Recognition may already be stopped. */ }
    const text = stripWakePhrase(spoken, preferences.wakePhrase);
    const match = matchCommand(text, preferences);
    if (!match) {
      processingRef.current = false;
      speak("I don’t recognize that command. Say “what can you do” to hear examples.");
      return;
    }

    let reply = "Command completed.";
    const id = match.command.id;
    try {
      switch (id) {
        case "system-status":
          reply = `Voice recognition is ${recognitionSupported ? "available" : "not supported in this browser"}. Wake-word listening is ${wakeListening ? "active" : "inactive"}. Speech output is ${speechSupported ? "available" : "not supported"}. Spotify is ${spotifyConnected ? "connected" : "not connected"}.`;
          break;
        case "get-time":
          reply = `The time is ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date())}.`;
          break;
        case "get-date":
          reply = `Today is ${new Intl.DateTimeFormat(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date())}.`;
          break;
        case "open-dashboard": router.push("/"); reply = "Opening the Batcomputer dashboard."; break;
        case "open-operations": router.push("/operations"); reply = "Opening operations."; break;
        case "open-database": router.push("/database"); reply = "Opening the command database."; break;
        case "open-settings": router.push("/settings/assistant"); reply = "Opening assistant settings."; break;
        case "open-music": router.push("/music"); reply = "Opening music controls."; break;
        case "close-assistant": setOverlayOpen(false); reply = "Assistant dismissed."; break;
        case "sleep":
          disableWakeWord();
          setOverlayOpen(false);
          reply = "Wake-word listening is off. Standing down.";
          break;
        case "repeat-last": reply = lastResponseRef.current; break;
        case "list-commands":
          reply = "I can report system status, tell the time or date, open dashboard sections, and control Spotify playback. The full command list is in the command database.";
          break;
        case "stop-speaking":
          if ("speechSynthesis" in window) window.speechSynthesis.cancel();
          speakingRef.current = false;
          setResponse("Speech stopped.");
          setPhase("idle");
          processingRef.current = false;
          if (wakeEnabledRef.current) void startRecognition("wake");
          return;
        case "silent-on": updatePreferences({ silentMode: true }); reply = "Silent mode is on. You’ll see responses on screen."; break;
        case "silent-off": updatePreferences({ silentMode: false }); reply = "Spoken responses are back on."; break;
        case "animations-on": updatePreferences({ animations: true }); reply = "Interface animations enabled."; break;
        case "animations-off": updatePreferences({ animations: false }); reply = "Interface animations disabled."; break;
        case "music-play": reply = await performSpotifyAction("play"); break;
        case "music-pause": reply = await performSpotifyAction("pause"); break;
        case "music-next": reply = await performSpotifyAction("next"); break;
        case "music-previous": reply = await performSpotifyAction("previous"); break;
        case "music-liked": reply = await performSpotifyAction("liked"); break;
        case "music-playlist": reply = await performSpotifyAction("playlist", match.argument); break;
        case "music-volume-up": reply = await performSpotifyAction("volume-up"); break;
        case "music-volume-down": reply = await performSpotifyAction("volume-down"); break;
        case "music-shuffle-on": reply = await performSpotifyAction("shuffle-on"); break;
        case "music-shuffle-off": reply = await performSpotifyAction("shuffle-off"); break;
        case "music-repeat-on": reply = await performSpotifyAction("repeat-on"); break;
        case "music-repeat-off": reply = await performSpotifyAction("repeat-off"); break;
        case "music-current": {
          const nowPlaying = await fetch("/api/spotify/status", { cache: "no-store" });
          if (!nowPlaying.ok) {
            const error = await nowPlaying.json().catch(() => ({})) as { message?: string };
            reply = error.message ?? "I couldn’t retrieve the current Spotify track.";
            break;
          }
          const data = await nowPlaying.json() as { playback?: { item?: { name?: string; artists?: Array<{ name?: string }> } } | null };
          const item = data.playback?.item;
          reply = item?.name ? `Now playing ${item.name}${item.artists?.length ? ` by ${item.artists.map((artist) => artist.name).filter(Boolean).join(", ")}` : ""}.` : "No Spotify track is currently playing.";
          break;
        }
        case "open-spotify": window.open("https://open.spotify.com", "_blank", "noopener,noreferrer"); reply = "Opening Spotify in a new tab."; break;
        case "open-youtube": window.open("https://www.youtube.com", "_blank", "noopener,noreferrer"); reply = "Opening YouTube in a new tab."; break;
        case "open-google": window.open("https://www.google.com", "_blank", "noopener,noreferrer"); reply = "Opening Google in a new tab."; break;
        case "open-browser": window.open("https://www.google.com", "_blank", "noopener,noreferrer"); reply = "Opening a new browser tab."; break;
      }
    } catch {
      reply = "That request could not be completed. Check the connection and try again.";
    }
    processingRef.current = false;
    speak(reply);
  }, [preferences, recognitionSupported, speechSupported, spotifyConnected, wakeListening, router, speak, performSpotifyAction, updatePreferences, disableWakeWord, startRecognition]);

  useEffect(() => { runCommandRef.current = runCommand; }, [runCommand]);

  const activateManually = useCallback(async () => {
    setOverlayOpen(true);
    setTranscript("");
    setPhase("listening");
    playActivationTone(preferences.activationTone);
    if (!recognitionSupported) {
      setResponse("Speech recognition is not supported in this browser. Type a command below instead.");
      return;
    }
    await startRecognition("command");
  }, [preferences.activationTone, recognitionSupported, startRecognition]);

  const submitCommand = useCallback(async (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setOverlayOpen(true);
    setTranscript(clean);
    await runCommand(clean);
  }, [runCommand]);

  const closeAssistant = useCallback(() => {
    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    setOverlayOpen(false);
    if (!wakeEnabledRef.current) {
      modeRef.current = null;
      try { recognitionRef.current?.stop(); } catch { /* Recognition may already be stopped. */ }
      stopAudioCapture();
      setPhase("idle");
    }
  }, []);

  const previewVoice = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Voice profile check. Systems are standing by.");
    utterance.rate = preferences.speechRate;
    utterance.pitch = preferences.speechPitch;
    utterance.volume = preferences.speechVolume;
    const chosenVoice = voices.find((voice) => voice.voiceURI === preferences.voiceURI);
    if (chosenVoice) utterance.voice = chosenVoice;
    window.speechSynthesis.speak(utterance);
  }, [preferences.speechRate, preferences.speechPitch, preferences.speechVolume, preferences.voiceURI, voices]);

  const openMusicSettings = useCallback(() => router.push("/music"), [router]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && overlayOpen) closeAssistant();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overlayOpen, closeAssistant]);

  const contextValue = useMemo<AssistantContextValue>(() => ({
    preferences, voices, phase, audioLevel, wakeListening, recognitionSupported, speechSupported, micPermission, overlayOpen, transcript, response, spotifyConnected,
    updatePreferences, setCommandEnabled, setCommandPhrase, enableWakeWord, disableWakeWord, activateManually, closeAssistant, submitCommand, previewVoice, openMusicSettings,
  }), [preferences, voices, phase, audioLevel, wakeListening, recognitionSupported, speechSupported, micPermission, overlayOpen, transcript, response, spotifyConnected, updatePreferences, setCommandEnabled, setCommandPhrase, enableWakeWord, disableWakeWord, activateManually, closeAssistant, submitCommand, previewVoice, openMusicSettings]);

  return (
    <AssistantContext.Provider value={contextValue}>
      {children}
      {overlayOpen && <AssistantOverlay />}
    </AssistantContext.Provider>
  );
}

function AssistantOverlay() {
  const { preferences, phase, audioLevel, transcript, response, recognitionSupported, wakeListening, closeAssistant, activateManually, submitCommand } = useAssistant();
  const [command, setCommand] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const value = command.trim();
    if (!value) return;
    setCommand("");
    void submitCommand(value);
  };
  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <div className="assistant-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeAssistant()}>
      <section className="assistant-overlay" role="dialog" aria-modal="true" aria-labelledby="assistant-title">
        <div className="assistant-overlay__topline">
          <div className="assistant-live-label"><span className={`signal-dot ${phase === "listening" ? "signal-dot--live" : ""}`} />{phaseLabel(phase)}</div>
          <button className="icon-button assistant-overlay__close" type="button" aria-label="Close assistant" onClick={closeAssistant}><span aria-hidden="true">×</span></button>
        </div>
        <div className="assistant-overlay__center">
          <AssistantOrb phase={phase} appearance={preferences.orbAppearance} audioLevel={audioLevel} animations={preferences.animations} />
          <p className="eyebrow">BATCOMPUTER / VOICE INTERFACE</p>
          <h2 id="assistant-title">At your service.</h2>
          <p className="assistant-overlay__hint">{wakeListening ? `Say “${preferences.wakePhrase}” or enter a command` : recognitionSupported ? "Speak a command, or type one below" : "Voice recognition is unavailable here. Type a command below."}</p>
        </div>
        <div className="assistant-overlay__readout" aria-live="polite" aria-atomic="true">
          <span className="readout-label">{phase === "thinking" ? "PROCESSING" : transcript ? "HEARD" : "RESPONSE"}</span>
          <p>{phase === "thinking" ? "Checking the request…" : transcript || response}</p>
        </div>
        <form ref={formRef} className="assistant-composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="assistant-command">Enter a voice command</label>
          <input id="assistant-command" value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={onInputKeyDown} placeholder="Type a command…" autoComplete="off" />
          {recognitionSupported && <button className={`composer-mic ${phase === "listening" ? "is-active" : ""}`} type="button" aria-label={phase === "listening" ? "Restart voice listening" : "Activate microphone"} onClick={() => void activateManually()}><MicIcon /></button>}
          <button className="composer-submit" type="submit" aria-label="Send command"><ArrowIcon /></button>
        </form>
        <p className="assistant-overlay__privacy">Voice transcription uses your browser’s speech service. Audio is not sent to this app’s server.</p>
      </section>
    </div>
  );
}

function phaseLabel(phase: Phase) {
  if (phase === "listening") return "VOICE CHANNEL OPEN";
  if (phase === "thinking") return "PROCESSING REQUEST";
  if (phase === "speaking") return "VOICE RESPONSE";
  return "SYSTEM STANDBY";
}

async function startAudioCapture() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    if (activeStream?.getTracks().some((track) => track.readyState === "live")) return true;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    startAudioGraph(stream);
    return true;
  } catch {
    return false;
  }
}

let activeStream: MediaStream | null = null;
let activeAudioContext: AudioContext | null = null;
let activeFrame: number | null = null;
let activeLevelCallback: ((level: number) => void) | null = null;
function startAudioGraph(stream: MediaStream) {
  stopAudioCapture();
  activeStream = stream;
  try {
    const speechWindow = window as SpeechWindow;
    const AudioContextConstructor = window.AudioContext ?? speechWindow.webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = new AudioContextConstructor();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(stream).connect(analyser);
    const values = new Uint8Array(analyser.fftSize);
    let frameCount = 0;
    const draw = () => {
      analyser.getByteTimeDomainData(values);
      let energy = 0;
      for (const value of values) {
        const sample = (value - 128) / 128;
        energy += sample * sample;
      }
      if (frameCount++ % 3 === 0) activeLevelCallback?.(Math.min(1, Math.sqrt(energy / values.length) * 5.5));
      activeFrame = requestAnimationFrame(draw);
    };
    activeAudioContext = context;
    activeFrame = requestAnimationFrame(draw);
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    activeStream = null;
  }
}
function stopAudioCapture() {
  if (activeFrame !== null) cancelAnimationFrame(activeFrame);
  activeFrame = null;
  activeStream?.getTracks().forEach((track) => track.stop());
  activeStream = null;
  if (activeAudioContext && activeAudioContext.state !== "closed") void activeAudioContext.close();
  activeAudioContext = null;
  activeLevelCallback?.(0);
}
function playActivationTone(enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const AudioContextConstructor = window.AudioContext ?? (window as SpeechWindow).webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.09);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.17);
    oscillator.onended = () => void context.close();
  } catch { /* Activation tone is optional and never blocks voice commands. */ }
}

function MicIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="2.5" width="6" height="10" rx="3" /><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5m-3 0h6" /></svg>;
}
function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 10h12m-5-5 5 5-5 5" /></svg>;
}
