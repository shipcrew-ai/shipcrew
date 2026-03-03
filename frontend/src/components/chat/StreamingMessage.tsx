"use client";
import { motion } from "framer-motion";
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
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex gap-3 px-4 py-1.5 glass-surface rounded-lg mx-2 border-l-2 border-l-[var(--color-active)]"
    >
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
          <span className="text-[10px] text-slack-active animate-glow-pulse">typing...</span>
        </div>
        <div className="text-sm text-slack-text prose-chat leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          <span className="cursor-blink" />
        </div>
      </div>
    </motion.div>
  );
}
