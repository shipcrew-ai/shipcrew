"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store";
import { apiFetch } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { useSocketEvents } from "@/hooks/useSocket";
import { OfficeCanvas } from "@/components/office/OfficeCanvas";
import { HudOverlay } from "@/components/hud/HudOverlay";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { AgentEditorDialog } from "@/components/agents/AgentEditorDialog";
import { NewProjectDialog } from "@/components/layout/NewProjectDialog";
import type { Project, Channel, Agent, Task } from "@devteam/shared";

interface ProjectFull extends Project {
  agents: Agent[];
  channels: Channel[];
}

export default function Home() {
  const {
    projects,
    setProjects,
    setActiveProject,
    activeProject,
    setChannels,
    setAgents,
    setTasks,
    setActiveChannelId,
    channels,
    clearMessages,
    newProjectDialogOpen,
    setNewProjectDialogOpen,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = "/login";
    }
  }, []);

  // Connect socket and register events
  useSocketEvents();

  useEffect(() => {
    if (!isAuthenticated()) return;

    async function init() {
      try {
        const projects = await apiFetch<ProjectFull[]>("/api/projects");

        if (projects.length === 0) {
          setShowWelcome(true);
          setLoading(false);
          return;
        }

        const project = projects[0];
        setProjects(projects);
        setActiveProject(project);
        setAgents(project.agents);
        setChannels(project.channels);

        const general = project.channels.find((c) => c.name === "general");
        setActiveChannelId(general?.id ?? project.channels[0].id);

        const tasks = await apiFetch<Task[]>(
          `/api/projects/${project.id}/tasks`
        );
        setTasks(tasks);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-mesh relative noise">
        <div className="glass-raised rounded-2xl p-8 text-center">
          <div className="text-3xl mb-3">🤖</div>
          <div className="w-32 h-1 rounded-full bg-slack-input overflow-hidden mx-auto">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse" />
          </div>
          <p className="text-slack-muted text-sm mt-3">Loading ShipCrew...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-mesh relative noise">
        <div className="glass-raised rounded-2xl p-8 text-center max-w-md">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-slack-heading font-semibold mb-2">Connection Error</p>
          <p className="text-slack-muted text-sm">{error}</p>
          <p className="text-slack-muted text-xs mt-3">
            Make sure the backend is running at{" "}
            {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
          </p>
        </div>
      </div>
    );
  }

  if (showWelcome || (projects.length === 0 && !loading)) {
    return (
      <WelcomeScreen
        onProjectCreated={(project) => {
          setProjects([project]);
          setActiveProject(project);
          setAgents(project.agents);
          setChannels(project.channels);
          const general = project.channels.find((c) => c.name === "general");
          setActiveChannelId(general?.id ?? project.channels[0].id);
          setShowWelcome(false);
        }}
      />
    );
  }

  return (
    <div className="h-screen relative overflow-hidden">
      <OfficeCanvas />
      <HudOverlay />
      <AgentEditorDialog />
      <NewProjectDialog
        open={newProjectDialogOpen}
        onClose={() => setNewProjectDialogOpen(false)}
        onCreated={(project) => {
          setProjects([...projects, project]);
          clearMessages();
          setActiveProject(project);
          setAgents(project.agents);
          setChannels(project.channels);
          const general = project.channels.find((c) => c.name === "general");
          setActiveChannelId(general?.id ?? project.channels[0]?.id);
          apiFetch<Task[]>(`/api/projects/${project.id}/tasks`)
            .then(setTasks)
            .catch(() => setTasks([]));
        }}
      />
    </div>
  );
}
