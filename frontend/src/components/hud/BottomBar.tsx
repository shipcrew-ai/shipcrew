"use client";
import { useAppStore } from "@/store";
import { MessageInput } from "@/components/chat/MessageInput";

export function BottomBar() {
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const activeProject = useAppStore((s) => s.activeProject);
  const channels = useAppStore((s) => s.channels);

  const channel = channels.find((c) => c.id === activeChannelId);

  if (!activeChannelId || !activeProject || !channel) return null;

  return (
    <div className="pointer-events-auto w-full max-w-[640px] mx-auto">
      <MessageInput
        channelId={activeChannelId}
        projectId={activeProject.id}
        channelName={channel.name}
      />
    </div>
  );
}
