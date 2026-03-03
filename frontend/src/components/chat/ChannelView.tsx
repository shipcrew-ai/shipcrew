"use client";
import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { MessageBubble } from "./MessageBubble";
import { StreamingMessage } from "./StreamingMessage";
import { MessageInput } from "./MessageInput";
import type { Message } from "@devteam/shared";

interface Props {
  channelId: string;
  channelName: string;
  projectId: string;
}

export function ChannelView({ channelId, channelName, projectId }: Props) {
  const { messagesByChannel, setMessages, streamingMessages } = useAppStore();
  const messages = messagesByChannel[channelId] ?? [];
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load message history
  useEffect(() => {
    apiFetch<Message[]>(`/api/channels/${channelId}/messages?limit=50`)
      .then((msgs) => setMessages(channelId, msgs))
      .catch(console.error);
  }, [channelId, setMessages]);

  // Join socket room
  useEffect(() => {
    const socket = getSocket();
    socket.emit("channel.join", { channelId });
    return () => {
      socket.emit("channel.leave", { channelId });
    };
  }, [channelId]);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamingMessages]);

  const activeStreams = Object.values(streamingMessages).filter(
    (s) => s.channelId === channelId
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-0.5">
        {messages.length === 0 && (
          <div className="text-center text-slack-muted text-sm py-12">
            <div className="glass-raised rounded-2xl p-8 inline-block">
              <div className="text-4xl mb-3">💬</div>
              <p>This is the beginning of <strong className="text-slack-text">#{channelName}</strong></p>
              <p className="mt-1 text-xs">Type a message to get started</p>
            </div>
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

      {/* Input */}
      <MessageInput
        channelId={channelId}
        projectId={projectId}
        channelName={channelName}
      />
    </div>
  );
}
