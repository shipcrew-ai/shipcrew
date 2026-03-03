"use client";
import { TopBar } from "./TopBar";
import { BottomBar } from "./BottomBar";
import { ChatPanel } from "./ChatPanel";
import { AgentInfoPanel } from "./AgentInfoPanel";
import { MiniTaskBoard } from "./MiniTaskBoard";

export function HudOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col z-10">
      {/* Top bar */}
      <TopBar />

      {/* Middle: side panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: task board */}
        <MiniTaskBoard />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right panel: chat */}
        <ChatPanel />
      </div>

      {/* Bottom bar: message input */}
      <div className="pb-4 px-4">
        <BottomBar />
      </div>

      {/* Agent info modal */}
      <AgentInfoPanel />
    </div>
  );
}
