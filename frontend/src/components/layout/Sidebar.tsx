"use client";
import { useState } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { sidebarVariants, dropdownVariants } from "@/lib/motion";
import type { Project, Agent, Channel } from "@devteam/shared";
import { apiFetch } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import type { Task } from "@devteam/shared";

interface ProjectFull extends Project {
  agents: Agent[];
  channels: Channel[];
}

export function Sidebar() {
  const {
    projects,
    activeProject,
    setProjects,
    setActiveProject,
    channels,
    activeChannelId,
    setActiveChannelId,
    setChannels,
    setAgents,
    setTasks,
    clearMessages,
    agents,
    setTaskPanelOpen,
    taskPanelOpen,
    setFilesPanelOpen,
    filesPanelOpen,
    setAgentEditorOpen,
    setEditingAgent,
    setNewProjectDialogOpen,
  } = useAppStore();

  const [showProjectMenu, setShowProjectMenu] = useState(false);

  const switchProject = async (project: ProjectFull) => {
    clearMessages();
    setActiveProject(project);
    setAgents(project.agents);
    setChannels(project.channels);
    const general = project.channels.find((c) => c.name === "general");
    setActiveChannelId(general?.id ?? project.channels[0]?.id ?? null);
    setShowProjectMenu(false);

    // Load tasks for the new project
    try {
      const tasks = await apiFetch<Task[]>(`/api/projects/${project.id}/tasks`);
      setTasks(tasks);
    } catch {
      setTasks([]);
    }
  };

  return (
    <motion.div
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
      className="w-60 glass-surface rounded-r-2xl flex flex-col h-full"
    >
      {/* Header / Project Selector */}
      <div className="relative">
        <button
          onClick={() => setShowProjectMenu(!showProjectMenu)}
          className="w-full px-4 py-3 border-b border-[var(--glass-border)] text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-slack-heading font-bold text-base truncate">
                {activeProject?.name ?? "ShipCrew"}
              </h1>
              <p className="text-slack-muted text-xs mt-0.5 truncate">
                {activeProject?.description ?? "Select a project"}
              </p>
            </div>
            <svg
              className={clsx(
                "w-4 h-4 text-slack-muted flex-shrink-0 transition-transform",
                showProjectMenu && "rotate-180"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {showProjectMenu && (
            <motion.div
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute top-full left-2 right-2 z-40 glass-raised rounded-xl mt-1 max-h-64 overflow-y-auto"
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
                    "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2",
                    activeProject?.id === p.id
                      ? "bg-slack-active/20 text-slack-heading"
                      : "text-slack-text hover:bg-white/5"
                  )}
                >
                  <span className="text-base">📁</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    {p.description && (
                      <p className="text-[10px] text-slack-muted truncate">{p.description}</p>
                    )}
                  </div>
                </button>
              ))}

              <button
                onClick={() => {
                  setShowProjectMenu(false);
                  setNewProjectDialogOpen(true);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-slack-muted hover:bg-white/5 hover:text-slack-heading transition-colors flex items-center gap-2 border-t border-[var(--glass-border)]"
              >
                <span className="text-base">+</span>
                <span>New Project</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto py-3">
        <div className="px-3 mb-1">
          <p className="text-xs font-semibold text-slack-muted uppercase tracking-wider px-2 mb-1">
            Channels
          </p>
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannelId(ch.id)}
              className={clsx(
                "w-full text-left px-2 py-1 rounded-lg text-sm flex items-center gap-1.5 transition-colors relative",
                activeChannelId === ch.id
                  ? "bg-slack-active/20 text-slack-active"
                  : "text-slack-text hover:bg-white/5"
              )}
            >
              {activeChannelId === ch.id && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-slack-active" />
              )}
              <span className="text-slack-muted">#</span>
              {ch.name}
            </button>
          ))}
        </div>

        {/* Tools */}
        <div className="px-3 mt-3 space-y-0.5">
          <button
            onClick={() => setTaskPanelOpen(!taskPanelOpen)}
            className={clsx(
              "w-full text-left px-2 py-1 rounded-lg text-sm flex items-center gap-2 transition-colors relative",
              taskPanelOpen
                ? "bg-slack-active/20 text-slack-active"
                : "text-slack-text hover:bg-white/5"
            )}
          >
            {taskPanelOpen && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-slack-active" />
            )}
            <span>📋</span>
            Task Board
          </button>
          <button
            onClick={() => setFilesPanelOpen(!filesPanelOpen)}
            className={clsx(
              "w-full text-left px-2 py-1 rounded-lg text-sm flex items-center gap-2 transition-colors relative",
              filesPanelOpen
                ? "bg-slack-active/20 text-slack-active"
                : "text-slack-text hover:bg-white/5"
            )}
          >
            {filesPanelOpen && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-slack-active" />
            )}
            <span>📂</span>
            Project Files
          </button>
        </div>

        {/* Agents */}
        <div className="px-3 mt-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-xs font-semibold text-slack-muted uppercase tracking-wider">
              Team
            </p>
            <button
              onClick={() => {
                setEditingAgent(null);
                setAgentEditorOpen(true);
              }}
              className="w-5 h-5 rounded flex items-center justify-center text-slack-muted hover:text-slack-heading hover:bg-white/5 transition-colors text-sm"
              title="Add agent"
            >
              +
            </button>
          </div>
          <div className="space-y-1">
            {agents.map((agent) => (
              <motion.button
                key={agent.id}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                onClick={() => {
                  setEditingAgent(agent);
                  setAgentEditorOpen(true);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left"
              >
                <AgentAvatar agent={agent} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-slack-text truncate">{agent.name}</p>
                    {agent.isCustom && (
                      <span className="text-[8px] px-1 py-0.5 rounded glass-surface text-slack-active font-medium flex-shrink-0">
                        custom
                      </span>
                    )}
                  </div>
                  {agent.statusMessage && agent.status !== "idle" ? (
                    <p className="text-[10px] text-slack-muted truncate">
                      {agent.statusMessage}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slack-muted">{agent.title}</p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="px-3 py-2 border-t border-slack-border-subtle">
        <button
          onClick={() => {
            clearToken();
            window.location.href = "/login";
          }}
          className="w-full text-left px-2 py-1 rounded text-xs text-slack-muted hover:text-slack-heading hover:bg-white/5 transition-colors"
        >
          Sign out
        </button>
      </div>

    </motion.div>
  );
}
