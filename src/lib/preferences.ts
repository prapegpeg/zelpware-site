export type OrbAppearance = "titanium" | "moonstone" | "amber";

export type AssistantPreferences = {
  wakePhrase: string;
  wakeWordEnabled: boolean;
  voiceURI: string;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  activationTone: boolean;
  animations: boolean;
  orbAppearance: OrbAppearance;
  silentMode: boolean;
  commandEnabled: Record<string, boolean>;
  commandPhrases: Record<string, string>;
};

export const DEFAULT_PREFERENCES: AssistantPreferences = {
  wakePhrase: "hey batman",
  wakeWordEnabled: false,
  voiceURI: "",
  speechRate: 0.9,
  speechPitch: 0.72,
  speechVolume: 0.88,
  activationTone: true,
  animations: true,
  orbAppearance: "titanium",
  silentMode: false,
  commandEnabled: {},
  commandPhrases: {},
};

export type CommandDefinition = {
  id: string;
  group: string;
  name: string;
  description: string;
  phrase: string;
  alternatives: string[];
};

export const COMMANDS: CommandDefinition[] = [
  { id: "system-status", group: "System", name: "System status", description: "Report browser voice and Spotify connection status.", phrase: "system status", alternatives: ["status report", "run diagnostics", "diagnostic status"] },
  { id: "get-time", group: "System", name: "Current time", description: "Read the current local time aloud.", phrase: "what time is it", alternatives: ["tell me the time", "time check", "current time"] },
  { id: "get-date", group: "System", name: "Current date", description: "Read today’s local date aloud.", phrase: "what is the date", alternatives: ["what day is it", "today’s date", "what's today's date", "current date"] },
  { id: "open-dashboard", group: "Navigation", name: "Dashboard", description: "Return to the Batcomputer overview.", phrase: "open dashboard", alternatives: ["open batcomputer", "go to dashboard", "go home"] },
  { id: "open-operations", group: "Navigation", name: "Operations", description: "Open browser and voice system diagnostics.", phrase: "open operations", alternatives: ["show operations", "open system operations"] },
  { id: "open-database", group: "Navigation", name: "Command database", description: "Open the locally stored command registry.", phrase: "open database", alternatives: ["open command database", "show command database"] },
  { id: "open-settings", group: "Navigation", name: "Assistant settings", description: "Open wake phrase, voice, and orb settings.", phrase: "open settings", alternatives: ["open assistant settings", "open personalisation", "open personalization"] },
  { id: "open-music", group: "Navigation", name: "Music controls", description: "Open Spotify connection and playback controls.", phrase: "open music", alternatives: ["open music controls", "open spotify controls"] },
  { id: "close-assistant", group: "Assistant", name: "Close assistant", description: "Dismiss the active assistant overlay.", phrase: "close assistant", alternatives: ["close batcomputer", "dismiss assistant", "hide assistant"] },
  { id: "sleep", group: "Assistant", name: "Go to sleep", description: "Stop wake-word listening and close the assistant.", phrase: "go to sleep", alternatives: ["sleep now", "stand down"] },
  { id: "repeat-last", group: "Assistant", name: "Repeat response", description: "Repeat the assistant’s last spoken response.", phrase: "repeat that", alternatives: ["say that again", "repeat your last response"] },
  { id: "list-commands", group: "Assistant", name: "Command help", description: "Hear a short list of available commands.", phrase: "what can you do", alternatives: ["list commands", "command help", "help me", "what commands can you perform"] },
  { id: "stop-speaking", group: "Assistant", name: "Stop speaking", description: "Immediately stop speech output.", phrase: "stop speaking", alternatives: ["be quiet", "stop talking"] },
  { id: "silent-on", group: "Assistant", name: "Enable silent mode", description: "Turn off spoken responses while keeping on-screen feedback.", phrase: "enable silent mode", alternatives: ["go silent", "turn on silent mode", "activate silent mode"] },
  { id: "silent-off", group: "Assistant", name: "Disable silent mode", description: "Restore spoken responses.", phrase: "disable silent mode", alternatives: ["turn off silent mode", "speak normally"] },
  { id: "animations-on", group: "Assistant", name: "Enable animations", description: "Restore orb and interface motion.", phrase: "enable animations", alternatives: ["turn on animations", "animations on"] },
  { id: "animations-off", group: "Assistant", name: "Disable animations", description: "Reduce interface motion.", phrase: "disable animations", alternatives: ["turn off animations", "animations off"] },
  { id: "music-play", group: "Spotify", name: "Play or resume", description: "Resume playback on the active Spotify device.", phrase: "play music", alternatives: ["resume music", "start playback", "resume playback"] },
  { id: "music-pause", group: "Spotify", name: "Pause playback", description: "Pause playback on the active Spotify device.", phrase: "pause music", alternatives: ["pause playback", "stop the music"] },
  { id: "music-next", group: "Spotify", name: "Next track", description: "Skip to the next track.", phrase: "next track", alternatives: ["skip track", "skip this song", "next song"] },
  { id: "music-previous", group: "Spotify", name: "Previous track", description: "Return to the previous track.", phrase: "previous track", alternatives: ["go back a track", "previous song", "restart the song"] },
  { id: "music-liked", group: "Spotify", name: "Play liked songs", description: "Start a selection from your saved Spotify tracks.", phrase: "play my liked songs", alternatives: ["play liked songs", "play my saved songs", "play my liked music"] },
  { id: "music-playlist", group: "Spotify", name: "Play a playlist", description: "Play a playlist whose name you include, such as “play gym playlist”.", phrase: "play {playlist} playlist", alternatives: [] },
  { id: "music-current", group: "Spotify", name: "What’s playing", description: "Read the current track and artist aloud.", phrase: "what is playing", alternatives: ["what’s playing", "current song", "what song is this"] },
  { id: "music-volume-up", group: "Spotify", name: "Volume up", description: "Increase Spotify device volume by 10 percent.", phrase: "volume up", alternatives: ["turn the volume up", "increase volume", "louder"] },
  { id: "music-volume-down", group: "Spotify", name: "Volume down", description: "Decrease Spotify device volume by 10 percent.", phrase: "volume down", alternatives: ["turn the volume down", "decrease volume", "quieter"] },
  { id: "music-shuffle-on", group: "Spotify", name: "Enable shuffle", description: "Turn Spotify shuffle on.", phrase: "enable shuffle", alternatives: ["turn on shuffle", "turn shuffle on", "shuffle on"] },
  { id: "music-shuffle-off", group: "Spotify", name: "Disable shuffle", description: "Turn Spotify shuffle off.", phrase: "disable shuffle", alternatives: ["turn off shuffle", "turn shuffle off", "shuffle off"] },
  { id: "music-repeat-on", group: "Spotify", name: "Repeat track", description: "Repeat the current Spotify track.", phrase: "repeat this track", alternatives: ["repeat track", "turn on repeat", "repeat this song"] },
  { id: "music-repeat-off", group: "Spotify", name: "Disable repeat", description: "Turn Spotify repeat off.", phrase: "disable repeat", alternatives: ["turn off repeat", "repeat off"] },
  { id: "open-spotify", group: "Applications", name: "Open Spotify", description: "Open Spotify’s web player in a new tab.", phrase: "open spotify", alternatives: ["launch spotify", "go to spotify"] },
  { id: "open-youtube", group: "Applications", name: "Open YouTube", description: "Open YouTube in a new tab.", phrase: "open youtube", alternatives: ["launch youtube", "go to youtube"] },
  { id: "open-google", group: "Applications", name: "Open Google", description: "Open Google in a new tab.", phrase: "open google", alternatives: ["search google", "go to google"] },
  { id: "open-browser", group: "Applications", name: "Open browser", description: "Open a Google tab in this browser.", phrase: "open my browser", alternatives: ["open browser", "launch browser"] },
];

export function sanitizePreferences(value: unknown): AssistantPreferences {
  if (!value || typeof value !== "object") return DEFAULT_PREFERENCES;
  const stored = value as Partial<AssistantPreferences>;
  const appearance = stored.orbAppearance;
  return {
    ...DEFAULT_PREFERENCES,
    ...stored,
    wakePhrase: typeof stored.wakePhrase === "string" ? stored.wakePhrase.slice(0, 40) : DEFAULT_PREFERENCES.wakePhrase,
    wakeWordEnabled: Boolean(stored.wakeWordEnabled),
    voiceURI: typeof stored.voiceURI === "string" ? stored.voiceURI : "",
    speechRate: clampNumber(stored.speechRate, 0.65, 1.2, DEFAULT_PREFERENCES.speechRate),
    speechPitch: clampNumber(stored.speechPitch, 0.5, 1.25, DEFAULT_PREFERENCES.speechPitch),
    speechVolume: clampNumber(stored.speechVolume, 0, 1, DEFAULT_PREFERENCES.speechVolume),
    activationTone: stored.activationTone !== false,
    animations: stored.animations !== false,
    orbAppearance: appearance === "moonstone" || appearance === "amber" ? appearance : "titanium",
    silentMode: Boolean(stored.silentMode),
    commandEnabled: isRecord(stored.commandEnabled) ? stored.commandEnabled : {},
    commandPhrases: isStringRecord(stored.commandPhrases) ? stored.commandPhrases : {},
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function isRecord(value: unknown): value is Record<string, boolean> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.values(value).every((item) => typeof item === "string"));
}
