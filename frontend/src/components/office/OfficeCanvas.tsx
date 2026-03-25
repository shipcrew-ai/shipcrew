"use client";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { useAppStore } from "@/store";
import type { AgentStatus } from "@devteam/shared";
import { PixelOffice } from "./PixelOffice";

const STATUS_META: Record<AgentStatus, { label: string; color: string }> = {
  idle: { label: "Idle", color: "var(--status-green)" },
  thinking: { label: "Thinking", color: "var(--status-yellow)" },
  working: { label: "Working", color: "var(--status-blue)" },
  error: { label: "Error", color: "var(--status-red)" },
};

const STATUS_PRIORITY: Record<AgentStatus, number> = {
  error: 0,
  working: 1,
  thinking: 2,
  idle: 3,
};

export function OfficeCanvas() {
  const agents = useAppStore((s) => s.agents);
  const setSelectedAgentId = useAppStore((s) => s.setSelectedAgentId);

  const statusCounts = agents.reduce<Record<AgentStatus, number>>(
    (counts, agent) => {
      counts[agent.status] += 1;
      return counts;
    },
    { idle: 0, thinking: 0, working: 0, error: 0 }
  );

  const spotlightAgents = [...agents]
    .sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status])
    .slice(0, 4);

  const introCard = (
    <div className="office-card pointer-events-auto px-4 py-3 sm:px-5">
      <p className="office-kicker">ShipCrew Live Office</p>
      <h1 className="mt-2 text-sm font-semibold text-white sm:text-base">
        Interactive pixel workspace
      </h1>
      <p className="mt-2 text-[11px] leading-4 text-white/70 sm:text-xs sm:leading-5">
        Click a crew member to inspect them, tap a glowing monitor to jump into
        their channel, and use the whiteboard to open the task board.
      </p>

      {spotlightAgents.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
            Jump to agent
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {spotlightAgents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => setSelectedAgentId(agent.id)}
                className="office-chip flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-left"
              >
                <AgentAvatar agent={agent} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-semibold text-white">
                    {agent.name}
                  </div>
                  <div className="truncate text-[10px] text-white/60">
                    {agent.statusMessage ?? STATUS_META[agent.status].label}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const pulseCard = (
    <div className="office-card min-w-[260px] px-4 py-3">
      <p className="office-kicker">Crew Pulse</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {Object.entries(STATUS_META).map(([status, meta]) => (
          <div
            key={status}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              {meta.label}
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              {statusCounts[status as AgentStatus]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#06070c]">
      <div className="office-backdrop" />
      <div className="office-grid" />
      <div className="office-glow office-glow-left" />
      <div className="office-glow office-glow-right" />

      <div className="pointer-events-none absolute inset-0 z-10 hidden 2xl:grid 2xl:grid-cols-[320px_minmax(0,1fr)_320px] 2xl:gap-6 2xl:p-6">
        <div className="self-start">{introCard}</div>
        <div />
        <div className="self-start">{pulseCard}</div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-5 md:p-8 2xl:px-[22rem] 2xl:pt-10 2xl:pb-24">
        <div className="office-theater">
          <div className="office-stage-label">Crew Floor</div>
          <PixelOffice />

          <div className="absolute left-4 top-4 z-10 hidden max-w-[320px] md:block 2xl:hidden">
            {introCard}
          </div>

          <div className="pointer-events-none absolute right-4 top-4 z-10 hidden xl:block 2xl:hidden">
            {pulseCard}
          </div>
        </div>
      </div>
    </div>
  );
}
