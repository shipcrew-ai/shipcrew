"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { modalOverlayVariants, modalContentVariants } from "@/lib/motion";

const STATUS_LABELS: Record<string, string> = {
  idle: "Idle",
  thinking: "Thinking...",
  working: "Working",
  error: "Error",
};

export function AgentInfoPanel() {
  const {
    selectedAgentId,
    setSelectedAgentId,
    agents,
    setEditingAgent,
    setAgentEditorOpen,
    messagesByChannel,
    channels,
  } = useAppStore();

  const agent = agents.find((a) => a.id === selectedAgentId);

  const close = () => setSelectedAgentId(null);

  const openEditor = () => {
    if (!agent) return;
    setEditingAgent(agent);
    setAgentEditorOpen(true);
    close();
  };

  // Find recent messages from this agent across all channels
  const recentMessages = agent
    ? Object.values(messagesByChannel)
        .flat()
        .filter((m) => m.agentId === agent.id)
        .slice(-3)
    : [];

  return (
    <AnimatePresence>
      {agent && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
          variants={modalOverlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={close}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Content */}
          <motion.div
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative glass-raised rounded-2xl p-6 w-[360px] max-h-[80vh] overflow-y-auto"
          >
            {/* Close button */}
            <button
              onClick={close}
              className="absolute top-3 right-3 text-slack-muted hover:text-slack-heading p-1 rounded hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Agent info */}
            <div className="flex items-center gap-3 mb-4">
              <AgentAvatar agent={agent} size="lg" showStatus />
              <div>
                <h3 className="text-slack-heading font-bold text-base">{agent.name}</h3>
                <p className="text-slack-muted text-xs">{agent.title}</p>
              </div>
            </div>

            {/* Status */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slack-muted uppercase tracking-wider mb-1">
                Status
              </p>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      agent.status === "idle" ? "var(--status-green)" :
                      agent.status === "thinking" ? "var(--status-yellow)" :
                      agent.status === "working" ? "var(--status-blue)" :
                      "var(--status-red)",
                  }}
                />
                <span className="text-sm text-slack-text">
                  {STATUS_LABELS[agent.status] ?? agent.status}
                </span>
                {agent.statusMessage && (
                  <span className="text-xs text-slack-muted ml-1">
                    — {agent.statusMessage}
                  </span>
                )}
              </div>
            </div>

            {/* Skills */}
            {agent.skills.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slack-muted uppercase tracking-wider mb-1">
                  Skills
                </p>
                <div className="flex flex-wrap gap-1">
                  {agent.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[10px] px-1.5 py-0.5 rounded glass-surface text-slack-text"
                    >
                      {skill.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Channels */}
            {agent.channels.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slack-muted uppercase tracking-wider mb-1">
                  Channels
                </p>
                <div className="flex flex-wrap gap-1">
                  {agent.channels.map((ch) => (
                    <span key={ch} className="text-xs text-slack-muted">#{ch}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent messages */}
            {recentMessages.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slack-muted uppercase tracking-wider mb-1">
                  Recent Messages
                </p>
                <div className="space-y-1.5">
                  {recentMessages.map((msg) => (
                    <div key={msg.id} className="text-xs text-slack-text glass-surface rounded-lg px-2 py-1.5 line-clamp-2">
                      {msg.content.slice(0, 120)}
                      {msg.content.length > 120 && "..."}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Edit button */}
            <button
              onClick={openEditor}
              className="w-full text-center px-3 py-2 rounded-lg text-sm font-medium bg-slack-active/20 text-slack-active hover:bg-slack-active/30 transition-colors"
            >
              Edit Agent
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
