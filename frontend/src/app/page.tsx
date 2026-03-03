"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store";
import { apiFetch } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { useSocketEvents } from "@/hooks/useSocket";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { TaskPanel } from "@/components/layout/TaskPanel";
import { FilesPanel } from "@/components/files/FilesPanel";
import { ChannelView } from "@/components/chat/ChannelView";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
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
    activeChannelId,
    channels,
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
      <div className="h-screen flex items-center justify-center bg-slack-bg">
        <div className="text-center">
          <div className="text-3xl mb-3">🤖</div>
          <p className="text-slack-muted text-sm">Loading Shipmate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slack-bg">
        <div className="text-center max-w-md">
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

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeChannel && activeProject ? (
              <ChannelView
                channelId={activeChannel.id}
                channelName={activeChannel.name}
                projectId={activeProject.id}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slack-muted">
                Select a channel to get started
              </div>
            )}
          </div>

          <TaskPanel />
          <FilesPanel />
        </div>
      </div>
    </div>
  );
}
