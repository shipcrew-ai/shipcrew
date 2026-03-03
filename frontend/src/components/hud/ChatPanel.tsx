"use client";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { StreamingMessage } from "@/components/chat/StreamingMessage";
import { panelSlideVariants } from "@/lib/motion";
import type { Message } from "@devteam/shared";

export function ChatPanel() {
  const {
    chatPanelOpen,
    setChatPanelOpen,
    activeChannelId,
    messagesByChannel,
    setMessages,
    streamingMessages,
    channels,
  } = useAppStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const channel = channels.find((c) => c.id === activeChannelId);
  const messages = activeChannelId ? messagesByChannel[activeChannelId] ?? [] : [];

  // Load messages when panel opens or channel changes
  useEffect(() => {
    if (!chatPanelOpen || !activeChannelId) return;
    apiFetch<Message[]>(`/api/channels/${activeChannelId}/messages?limit=50`)
      .then((msgs) => setMessages(activeChannelId, msgs))
      .catch((err) => console.error("[ChatPanel] Failed to load messages:", err));
  }, [chatPanelOpen, activeChannelId, setMessages]);

  // Join/leave socket room
  useEffect(() => {
    if (!chatPanelOpen || !activeChannelId) return;
    const socket = getSocket();
    socket.emit("channel.join", { channelId: activeChannelId });
    return () => {
      socket.emit("channel.leave", { channelId: activeChannelId });
    };
  }, [chatPanelOpen, activeChannelId]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamingMessages]);

  const activeStreams = Object.values(streamingMessages).filter(
    (s) => s.channelId === activeChannelId
  );

  return (
    <AnimatePresence>
      {chatPanelOpen && (
        <motion.div
          variants={panelSlideVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="hud-panel-right pointer-events-auto flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2">
              <span className="text-slack-muted">#</span>
              <span className="text-sm font-semibold text-slack-heading">
                {channel?.name ?? "chat"}
              </span>
            </div>
            <button
              onClick={() => setChatPanelOpen(false)}
              className="text-slack-muted hover:text-slack-heading p-1 rounded hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-0.5">
            {messages.length === 0 && (
              <div className="text-center text-slack-muted text-xs py-8">
                No messages yet
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>
            {activeStreams.map((stream) => (
              <StreamingMessage
                key={stream.id}
                messageId={stream.id}
                agentId={stream.agentId}
                content={stream.content}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
