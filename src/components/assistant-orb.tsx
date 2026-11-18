import type { CSSProperties } from "react";
import type { OrbAppearance } from "@/lib/preferences";

type OrbPhase = "idle" | "listening" | "thinking" | "speaking";

export function AssistantOrb({
  phase,
  appearance,
  audioLevel = 0,
  animations = true,
  compact = false,
}: {
  phase: OrbPhase;
  appearance: OrbAppearance;
  audioLevel?: number;
  animations?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`orb ${compact ? "orb--compact" : ""} ${animations ? "" : "orb--still"}`}
      data-phase={phase}
      data-appearance={appearance}
      style={{ "--audio-level": audioLevel } as CSSProperties}
      role="img"
      aria-label={`Assistant orb: ${phase}`}
    >
      <span className="orb__halo" />
      <span className="orb__body">
        <span className="orb__sheen" />
        <span className="orb__glint" />
        <span className="orb__core" />
      </span>
      {!compact && <span className="orb__orbit orb__orbit--one" />}
      {!compact && <span className="orb__orbit orb__orbit--two" />}
    </div>
  );
}
