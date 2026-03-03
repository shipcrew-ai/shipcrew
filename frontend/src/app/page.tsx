"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store";
import { apiFetch, getToken, clearToken } from "@/lib/api";
import { useSocketEvents } from "@/hooks/useSocket";
import { resetSocket } from "@/lib/socket";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { TaskPanel } from "@/components/layout/TaskPanel";
import { FilesPanel } from "@/components/files/FilesPanel";
import { ChannelView } from "@/components/chat/ChannelView";
import { LoginForm } from "@/components/auth/LoginForm";
import type { Project, Channel, Agent, Task } from "@devteam/shared";

interface ProjectFull extends Project {
  agents: Agent[];
  channels: Channel[];
}

export default function Home() {
  const {
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
  const [authenticated, setAuthenticated] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    if (getToken()) {
      setAuthenticated(true);
    } else {
      setLoading(false);
    }
  }, []);

  // Connect socket and register events (only when authenticated)
  useSocketEvents();

  useEffect(() => {
    if (!authenticated) return;

    async function init() {
      try {
        const projects = await apiFetch<ProjectFull[]>("/api/projects");

        if (projects.length === 0) {
          // Create a default project
          const newProject = await apiFetch<ProjectFull>("/api/projects", {
            method: "POST",
            body: JSON.stringify({
              name: "My First Project",
              description: "Get started by typing a message in #general",
            }),
          });
          projects.push(newProject);
        }

        const project = projects[0];
        setProjects(projects);
        setActiveProject(project);
        setAgents(project.agents);
        setChannels(project.channels);

        // Set active channel to #general
        const general = project.channels.find((c) => c.name === "general");
        setActiveChannelId(general?.id ?? project.channels[0].id);

        // Load tasks
        const tasks = await apiFetch<Task[]>(
          `/api/projects/${project.id}/tasks`
        );
        setTasks(tasks);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes("401")) {
          clearToken();
          setAuthenticated(false);
          return;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [authenticated]);

  if (!authenticated) {
    return (
      <LoginForm
        onSuccess={() => {
          resetSocket();
          setAuthenticated(true);
          setLoading(true);
        }}
      />
    );
  }

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

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          {/* Channel view */}
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

          {/* Side panels */}
          <TaskPanel />
          <FilesPanel />
        </div>
      </div>
    </div>
  );
}
