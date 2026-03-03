"use client";
import { motion } from "framer-motion";
import type { Message, Agent } from "@devteam/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { useAppStore } from "@/store";
import { messageVariants } from "@/lib/motion";

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const agents = useAppStore((s) => s.agents);
  const agent = message.agentId
    ? agents.find((a) => a.id === message.agentId) ?? null
    : null;

  const isUser = message.role === "user";
  const isScheduled = (message.metadata as any)?.scheduled;
  const isAutonomous = (message.metadata as any)?.autonomous;

  const senderName = isUser ? "You" : agent?.name ?? "System";
  const senderColor = agent?.color ?? "#8a8b8c";

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className="flex gap-3 px-4 py-1.5 rounded-lg mx-2 hover:bg-[var(--color-msg-hover)] group"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
            U
          </div>
        ) : agent ? (
          <AgentAvatar agent={agent} size="md" showStatus={false} />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-slack-input flex items-center justify-center text-slack-muted text-xs">
            SYS
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span
            className="text-sm font-semibold"
            style={{ color: isUser ? "var(--color-heading)" : senderColor }}
          >
            {senderName}
          </span>
          {agent?.title && (
            <span className="text-[10px] text-slack-muted font-normal">
              {agent.title}
            </span>
          )}
          {isScheduled && (
            <span className="text-[10px] text-slack-muted glass-surface rounded-full px-1.5 py-0.5">
              🕐 scheduled
            </span>
          )}
          {isAutonomous && !isScheduled && (
            <span className="text-[10px] text-slack-muted glass-surface rounded-full px-1.5 py-0.5">
              ⚡ autonomous
            </span>
          )}
          <span className="text-xs text-slack-muted opacity-0 group-hover:opacity-100 transition-opacity">
            {format(new Date(message.createdAt), "h:mm a")}
          </span>
        </div>

        <div className="text-sm text-slack-text prose-chat leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
