"use client";
import { useState } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { dropdownVariants } from "@/lib/motion";
import { apiFetch } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import type { Project, Agent, Channel, Task, InteractionMode } from "@devteam/shared";

interface ProjectFull extends Project {
  agents: Agent[];
  channels: Channel[];
}

export function TopBar() {
  const {
    projects,
    activeProject,
    setActiveProject,
    setProjects,
    channels,
    activeChannelId,
    setActiveChannelId,
    setChannels,
    setAgents,
    setTasks,
    clearMessages,
    agents,
    theme,
    toggleTheme,
    setNewProjectDialogOpen,
    setChatPanelOpen,
    setTaskBoardPanelOpen,
  } = useAppStore();

  const [showProjectMenu, setShowProjectMenu] = useState(false);

  const activeAgents = agents.filter(
    (a) => a.status === "thinking" || a.status === "working"
  );

  const mode = activeProject?.interactionMode ?? "newbie";

  const toggleMode = async () => {
    if (!activeProject) return;
    const newMode: InteractionMode =
      activeProject.interactionMode === "newbie" ? "advanced" : "newbie";
    try {
      const updated = await apiFetch<Project>(
        `/api/projects/${activeProject.id}/interaction-mode`,
        { method: "PATCH", body: JSON.stringify({ mode: newMode }) }
      );
      setActiveProject(updated);
    } catch (err) {
      console.error("[TopBar] Failed to toggle mode:", err);
    }
  };

  const switchProject = async (project: ProjectFull) => {
    clearMessages();
    setActiveProject(project);
    setAgents(project.agents);
    setChannels(project.channels);
    const general = project.channels.find((c) => c.name === "general");
    setActiveChannelId(general?.id ?? project.channels[0]?.id ?? null);
    setShowProjectMenu(false);
    try {
      const tasks = await apiFetch<Task[]>(`/api/projects/${project.id}/tasks`);
      setTasks(tasks);
    } catch {
      setTasks([]);
    }
  };

  return (
    <div className="hud-panel h-12 flex items-center justify-between px-4 pointer-events-auto">
      {/* Left: project + channels */}
      <div className="flex items-center gap-3">
        {/* Project selector */}
        <div className="relative">
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="flex items-center gap-1.5 text-sm font-bold text-slack-heading hover:text-white transition-colors"
          >
            {activeProject?.name ?? "ShipCrew"}
            <svg
              className={clsx("w-3 h-3 transition-transform", showProjectMenu && "rotate-180")}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <AnimatePresence>
            {showProjectMenu && (
              <motion.div
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute top-full left-0 mt-1 glass-raised rounded-xl min-w-[200px] max-h-64 overflow-y-auto z-50"
              >
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const full = p as ProjectFull;
                      if (full.agents && full.channels) {
                        switchProject(full);
                      } else {
                        apiFetch<ProjectFull>(`/api/projects/${p.id}`)
                          .then(switchProject)
                          .catch(console.error);
                      }
                    }}
                    className={clsx(
                      "w-full text-left px-3 py-2 text-sm transition-colors",
                      activeProject?.id === p.id
                        ? "bg-slack-active/20 text-slack-heading"
                        : "text-slack-text hover:bg-white/5"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
                <button
                  onClick={() => { setShowProjectMenu(false); setNewProjectDialogOpen(true); }}
                  className="w-full text-left px-3 py-2 text-sm text-slack-muted hover:bg-white/5 border-t border-[var(--glass-border)]"
                >
                  + New Project
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Channel tabs */}
        <div className="flex items-center gap-1">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => { setActiveChannelId(ch.id); setChatPanelOpen(true); }}
              className={clsx(
                "px-2 py-1 rounded text-xs font-medium transition-colors",
                activeChannelId === ch.id
                  ? "bg-slack-active/20 text-slack-active"
                  : "text-slack-muted hover:text-slack-text hover:bg-white/5"
              )}
            >
              #{ch.name}
            </button>
          ))}
        </div>
      </div>

      {/* Right: status + controls */}
      <div className="flex items-center gap-3">
        {/* Active agents */}
        {activeAgents.length > 0 && (
          <div className="flex items-center gap-1.5">
            {activeAgents.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center gap-1">
                <AgentAvatar agent={a} size="sm" />
                <span className="text-[10px] text-slack-muted hidden lg:block max-w-[100px] truncate">
                  {a.statusMessage ?? `${a.status}...`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Mode toggle */}
        <button
          onClick={toggleMode}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-[var(--glass-border)] hover:bg-white/5 transition-colors"
        >
          <span className={mode === "newbie" ? "text-green-400" : "text-blue-400"}>
            {mode === "newbie" ? "Guided" : "Auto"}
          </span>
          <div className={`w-6 h-3.5 rounded-full relative transition-colors ${mode === "newbie" ? "bg-green-600" : "bg-blue-600"}`}>
            <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${mode === "newbie" ? "left-0.5" : "left-3"}`} />
          </div>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="text-slack-muted hover:text-slack-heading p-1.5 rounded hover:bg-white/5 transition-colors"
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
        </button>

        {/* Task board button */}
        <button
          onClick={() => setTaskBoardPanelOpen(true)}
          className="text-slack-muted hover:text-slack-heading p-1.5 rounded hover:bg-white/5 transition-colors"
          title="Task board"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>

        {/* Sign out */}
        <button
          onClick={() => { clearToken(); window.location.href = "/login"; }}
          className="text-slack-muted hover:text-slack-heading p-1.5 rounded hover:bg-white/5 transition-colors text-xs"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
