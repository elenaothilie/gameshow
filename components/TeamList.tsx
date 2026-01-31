"use client";

import type { Team } from "@/lib/types";
import { ScoreTicker } from "@/components/ScoreTicker";

const COLOR_OPTIONS = [
  "#00E5FF",
  "#FF4DFF",
  "#FFD166",
  "#7CFF6B",
  "#9A7BFF",
  "#FF7A59",
  "#43D9FF",
  "#FFB703",
];

type TeamListProps = {
  teams: Team[];
  onUpdate: (teamId: string, patch: { name?: string; color?: string }) => void;
  onRemove: (teamId: string) => void;
};

export function TeamList({ teams, onUpdate, onRemove }: TeamListProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="text-sm uppercase tracking-[0.25em] text-cyan-200">
        Teams
      </div>
      <div className="mt-3 space-y-3">
        {teams.length === 0 ? (
          <div className="text-sm text-white/60">No teams joined yet.</div>
        ) : null}
        {teams.map((team) => (
          <div
            key={team.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3"
          >
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: team.color }}
            />
            <input
              value={team.name}
              onChange={(event) =>
                onUpdate(team.id, { name: event.target.value })
              }
              className="flex-1 rounded-lg border border-white/10 bg-transparent px-2 py-1 text-sm text-white"
            />
            <select
              value={team.color}
              onChange={(event) =>
                onUpdate(team.id, { color: event.target.value })
              }
              className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-sm text-white"
            >
              {COLOR_OPTIONS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
            <div className="text-sm font-semibold text-yellow-200">
              <ScoreTicker value={team.score} />
            </div>
            <button
              type="button"
              onClick={() => onRemove(team.id)}
              className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
