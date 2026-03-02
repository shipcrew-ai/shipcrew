"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { useAppStore } from "@/store";

interface Props {
  messageId: string;
  agentId: string;
  content: string;
}

export function StreamingMessage({ agentId, content }: Props) {
  const agents = useAppStore((s) => s.agents);
  const agent = agents.find((a) => a.id === agentId);

  if (!agent) return null;

  return (
    <div className="flex gap-3 px-4 py-1.5 bg-[var(--color-stream-bg)] animate-fade-in">
      <div className="flex-shrink-0 mt-0.5">
        <AgentAvatar agent={agent} size="md" showStatus={false} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span
            className="text-sm font-semibold"
            style={{ color: agent.color }}
          >
            {agent.name}
          </span>
          {agent.title && (
            <span className="text-[10px] text-slack-muted font-normal">
              {agent.title}
            </span>
          )}
          <span className="text-[10px] text-slack-muted">typing...</span>
        </div>
        <div className="text-sm text-slack-text prose-chat leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          <span className="cursor-blink" />
        </div>
      </div>
    </div>
  );
}
