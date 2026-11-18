"use client";

import Link from "next/link";
import { COMMANDS } from "@/lib/preferences";
import { useAssistant } from "@/components/assistant-provider";
import { ArrowUpRightIcon, DatabaseIcon } from "@/components/interface-icons";

export function DatabasePage() {
  const { preferences } = useAssistant();
  const activeCount = COMMANDS.filter((command) => preferences.commandEnabled[command.id] !== false).length;
  const groups = [...new Set(COMMANDS.map((command) => command.group))];
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div><p className="eyebrow"><span className="eyebrow-line" /> LOCAL COMMAND REGISTRY</p><h1>Database<span className="title-period">.</span></h1><p className="page-intro__description">The command index lives in your browser and works without an AI service.</p></div>
        <div className="intro-symbol"><DatabaseIcon /></div>
      </div>
      <section className="database-summary"><div><span className="eyebrow">AVAILABLE COMMANDS</span><strong>{String(activeCount).padStart(2, "0")}<small> / {String(COMMANDS.length).padStart(2, "0")}</small></strong></div><p>Commands execute against local navigation, browser speech features, or your connected Spotify account. Unmatched phrases are never sent to a model.</p><Link className="button button--quiet" href="/settings/commands">Manage library <ArrowUpRightIcon /></Link></section>
      <div className="command-catalog">
        {groups.map((group) => {
          const commands = COMMANDS.filter((command) => command.group === group);
          return <section className="catalog-group" key={group}><div className="catalog-group__head"><h2>{group}</h2><span>{String(commands.length).padStart(2, "0")} ENTRIES</span></div><div className="catalog-table">
            {commands.map((command, index) => {
              const enabled = preferences.commandEnabled[command.id] !== false;
              return <div className={`catalog-row ${!enabled ? "catalog-row--disabled" : ""}`} key={command.id}><span className="catalog-row__index">{String(index + 1).padStart(2, "0")}</span><div className="catalog-row__details"><strong>{command.name}</strong><small>{command.description}</small></div><code>{preferences.commandPhrases[command.id] || command.phrase}</code><span className={`catalog-row__state ${enabled ? "" : "is-disabled"}`}>{enabled ? "ACTIVE" : "OFF"}</span></div>;
            })}
          </div></section>;
        })}
      </div>
    </div>
  );
}
