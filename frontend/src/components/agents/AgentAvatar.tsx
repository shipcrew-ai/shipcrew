"use client";
import type { Agent, AgentStatus } from "@devteam/shared";
import clsx from "clsx";

const STATUS_COLOR: Record<AgentStatus, string> = {
  idle: "bg-slack-green",
  thinking: "bg-slack-yellow",
  working: "bg-slack-blue",
  error: "bg-slack-red",
};

interface Props {
  agent: Agent;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
}

const SIZE = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-12 h-12 text-xl",
};

export function AgentAvatar({ agent, size = "md", showStatus = true }: Props) {
  return (
    <div className={clsx("relative flex-shrink-0", SIZE[size])}>
      <div
        className={clsx(
          "w-full h-full rounded-lg flex items-center justify-center font-semibold"
        )}
        style={{ backgroundColor: agent.color + "33", color: agent.color }}
      >
        {agent.avatar}
      </div>
      {showStatus && (
        <span
          className={clsx(
            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-avatar-border)]",
            STATUS_COLOR[agent.status as AgentStatus],
            agent.status === "thinking" && "animate-pulse"
          )}
        />
      )}
    </div>
  );
}
