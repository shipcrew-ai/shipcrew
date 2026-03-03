"use client";
import { motion } from "framer-motion";
import { useAppStore } from "@/store";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { apiFetch } from "@/lib/api";
import type { InteractionMode, Project } from "@devteam/shared";

export function Header() {
  const {
    channels,
    activeChannelId,
    agents,
    setTaskPanelOpen,
    taskPanelOpen,
    setFilesPanelOpen,
    filesPanelOpen,
    activeProject,
    setActiveProject,
    theme,
    toggleTheme,
  } = useAppStore();
  const channel = channels.find((c) => c.id === activeChannelId);

  if (!channel) return null;

  const activeAgents = agents.filter(
    (a) => a.status === "thinking" || a.status === "working"
  );

  const toggleMode = async () => {
    if (!activeProject) return;
    const newMode: InteractionMode =
      activeProject.interactionMode === "newbie" ? "advanced" : "newbie";
    try {
      const updated = await apiFetch<Project>(
        `/api/projects/${activeProject.id}/interaction-mode`,
        {
          method: "PATCH",
          body: JSON.stringify({ mode: newMode }),
        }
      );
      setActiveProject(updated);
    } catch (err) {
      console.error("[Header] Failed to toggle interaction mode:", err);
    }
  };

  const mode = activeProject?.interactionMode ?? "newbie";

  return (
    <div className="h-12 border-b border-[var(--glass-border)] px-4 flex items-center justify-between bg-transparent backdrop-blur-md">
      {/* Left: channel name */}
      <div className="flex items-center gap-2">
        <span className="text-slack-muted font-medium">#</span>
        <span className="text-slack-heading font-semibold text-sm">{channel.name}</span>
        {channel.description && (
          <>
            <span className="text-slack-border">|</span>
            <span className="text-slack-muted text-xs hidden md:block truncate max-w-xs">
              {channel.description}
            </span>
          </>
        )}
      </div>

      {/* Right: theme + mode toggle + active agents + task panel */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <motion.button
          onClick={toggleTheme}
          whileTap={{ scale: 0.9, rotate: 15 }}
          className="text-slack-muted hover:text-slack-heading p-1.5 rounded hover:bg-white/5 transition-colors"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </motion.button>

        {/* Interaction mode toggle */}
        <button
          onClick={toggleMode}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors border border-[var(--glass-border)] hover:bg-white/5"
          title={
            mode === "newbie"
              ? "Newbie mode: PM asks clarifying questions before building"
              : "Advanced mode: PM proceeds with minimal questions"
          }
        >
          <span className={mode === "newbie" ? "text-green-400" : "text-blue-400"}>
            {mode === "newbie" ? "Guided" : "Auto"}
          </span>
          <div
            className={`w-7 h-4 rounded-full relative transition-colors ${
              mode === "newbie" ? "bg-green-600" : "bg-blue-600"
            }`}
            style={{
              boxShadow: `0 0 8px ${mode === "newbie" ? "rgba(34,197,94,0.3)" : "var(--color-active-glow)"}`,
            }}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                mode === "newbie" ? "left-0.5" : "left-3.5"
              }`}
            />
          </div>
        </button>

        {activeAgents.length > 0 && (
          <div className="flex items-center gap-2">
            {activeAgents.map((a) => (
              <div key={a.id} className="flex items-center gap-1.5">
                <AgentAvatar agent={a} size="sm" />
                <span className="text-xs text-slack-muted hidden lg:block">
                  {a.statusMessage ?? `${a.name} is ${a.status}...`}
                </span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => setFilesPanelOpen(!filesPanelOpen)}
          className={`p-1.5 rounded hover:bg-white/5 transition-colors ${filesPanelOpen ? "text-slack-heading bg-white/5" : "text-slack-muted hover:text-slack-heading"}`}
          title="Toggle project files"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </button>
        <button
          onClick={() => setTaskPanelOpen(!taskPanelOpen)}
          className={`p-1.5 rounded hover:bg-white/5 transition-colors ${taskPanelOpen ? "text-slack-heading bg-white/5" : "text-slack-muted hover:text-slack-heading"}`}
          title="Toggle task board"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
