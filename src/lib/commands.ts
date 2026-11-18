import { COMMANDS, type AssistantPreferences, type CommandDefinition } from "@/lib/preferences";

export type MatchedCommand = { command: CommandDefinition; argument?: string };

export function normalizeCommand(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'{}\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripWakePhrase(value: string, wakePhrase: string) {
  const text = normalizeCommand(value);
  const wake = normalizeCommand(wakePhrase);
  if (!wake) return text;
  return text.replace(new RegExp(`^${escapeRegExp(wake)}[\\s,]*`, "i"), "").trim();
}

export function matchCommand(value: string, preferences: AssistantPreferences): MatchedCommand | null {
  const normalized = normalizeCommand(value);
  if (!normalized) return null;

  const commandDefs = COMMANDS
    .filter((command) => preferences.commandEnabled[command.id] !== false)
    .filter((command) => command.id !== "music-playlist")
    .flatMap((command) => {
      const customPhrase = preferences.commandPhrases[command.id]?.trim();
      const phrases = [customPhrase, command.phrase, ...command.alternatives]
        .filter((phrase): phrase is string => Boolean(phrase))
        .map((phrase) => ({ command, phrase: normalizeCommand(phrase) }))
        .sort((a, b) => b.phrase.length - a.phrase.length);
      return phrases;
    });

  for (const { command, phrase } of commandDefs) {
    if (normalized === phrase || normalized.endsWith(` ${phrase}`)) return { command };
  }

  const playlist = COMMANDS.find((command) => command.id === "music-playlist");
  if (playlist && preferences.commandEnabled[playlist.id] !== false) {
    const match = normalized.match(/^(?:play|start|put on)\s+(?:my\s+)?(.+?)\s+playlist$/);
    if (match?.[1]) return { command: playlist, argument: match[1].trim() };
  }

  return null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
