"use client";
import { useState } from "react";
import clsx from "clsx";
import { useAppStore } from "@/store";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { AgentEditorDialog } from "@/components/agents/AgentEditorDialog";
import { NewProjectDialog } from "./NewProjectDialog";
import type { AgentStatus, Project, Agent, Channel } from "@devteam/shared";
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
  } = useAppStore();

  const [showNewProject, setShowNewProject] = useState(false);
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

  const handleProjectCreated = async (project: ProjectFull) => {
    setProjects([...projects, project]);
    await switchProject(project);
  };

  return (
    <div className="w-60 bg-slack-sidebar flex flex-col h-full border-r border-slack-border">
      {/* Header / Project Selector */}
      <div className="relative">
        <button
          onClick={() => setShowProjectMenu(!showProjectMenu)}
          className="w-full px-4 py-3 border-b border-slack-border text-left hover:bg-slack-hover transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-slack-heading font-bold text-base truncate">
                {activeProject?.name ?? "Shipmate"}
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
        {showProjectMenu && (
          <div className="absolute top-full left-0 right-0 z-40 bg-slack-sidebar border border-slack-border rounded-b-lg shadow-xl max-h-64 overflow-y-auto">
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
                    ? "bg-slack-active text-slack-heading"
                    : "text-slack-text hover:bg-slack-hover"
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
                setShowNewProject(true);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-slack-muted hover:bg-slack-hover hover:text-slack-heading transition-colors flex items-center gap-2 border-t border-slack-border"
            >
              <span className="text-base">+</span>
              <span>New Project</span>
            </button>
          </div>
        )}
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
                "w-full text-left px-2 py-1 rounded text-sm flex items-center gap-1.5 transition-colors",
                activeChannelId === ch.id
                  ? "bg-slack-active text-white"
                  : "text-slack-text hover:bg-slack-hover"
              )}
            >
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
              "w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 transition-colors",
              taskPanelOpen
                ? "bg-slack-active text-white"
                : "text-slack-text hover:bg-slack-hover"
            )}
          >
            <span>📋</span>
            Task Board
          </button>
          <button
            onClick={() => setFilesPanelOpen(!filesPanelOpen)}
            className={clsx(
              "w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 transition-colors",
              filesPanelOpen
                ? "bg-slack-active text-white"
                : "text-slack-text hover:bg-slack-hover"
            )}
          >
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
              className="w-5 h-5 rounded flex items-center justify-center text-slack-muted hover:text-slack-heading hover:bg-slack-hover transition-colors text-sm"
              title="Add agent"
            >
              +
            </button>
          </div>
          <div className="space-y-1">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  setEditingAgent(agent);
                  setAgentEditorOpen(true);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slack-hover transition-colors text-left"
              >
                <AgentAvatar agent={agent} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-slack-text truncate">{agent.name}</p>
                    {agent.isCustom && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-slack-active/20 text-slack-active font-medium flex-shrink-0">
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
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="px-3 py-2 border-t border-slack-border">
        <button
          onClick={() => {
            clearToken();
            window.location.href = "/login";
          }}
          className="w-full text-left px-2 py-1 rounded text-xs text-slack-muted hover:text-slack-heading hover:bg-slack-hover transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Dialogs */}
      <NewProjectDialog
        open={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreated={handleProjectCreated}
      />
      <AgentEditorDialog />
    </div>
  );
}
