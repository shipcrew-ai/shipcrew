"use client";
import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { clearToken } from "@/lib/auth";
import { useAppStore } from "@/store";

export function useSocketEvents() {
  const {
    appendMessage,
    appendStreamToken,
    finalizeStream,
    updateAgentStatus,
    addAgent,
    updateAgent,
    removeAgent,
    upsertTask,
    bumpFileTreeVersion,
    activeProject,
  } = useAppStore();

  const prevProjectId = useRef<string | null>(null);

  // Join/leave project room when active project changes
  useEffect(() => {
    const socket = getSocket();
    const newProjectId = activeProject?.id ?? null;

    if (prevProjectId.current && prevProjectId.current !== newProjectId) {
      socket.emit("project.leave", { projectId: prevProjectId.current });
    }

    if (newProjectId && newProjectId !== prevProjectId.current) {
      socket.emit("project.join", { projectId: newProjectId });
    }

    prevProjectId.current = newProjectId;

    return () => {
      if (newProjectId) {
        socket.emit("project.leave", { projectId: newProjectId });
      }
    };
  }, [activeProject?.id]);

  // Register global event listeners
  useEffect(() => {
    const socket = getSocket();

    socket.on("message.new", (message) => {
      appendMessage(message as any);
    });

    socket.on("message.stream", ({ messageId, agentId, channelId, token }) => {
      appendStreamToken(messageId, agentId, channelId, token);
    });

    socket.on("message.stream.end", ({ messageId }) => {
      finalizeStream(messageId);
    });

    socket.on("agent.status", ({ agentId, status, statusMessage }) => {
      updateAgentStatus(agentId, status, statusMessage);
    });

    socket.on("task.updated", (task) => {
      upsertTask(task as any);
    });

    socket.on("agent.created", (agent) => {
      addAgent(agent as any);
    });

    socket.on("agent.updated", (agent) => {
      updateAgent(agent as any);
    });

    socket.on("agent.deleted", ({ agentId }) => {
      removeAgent(agentId);
    });

    socket.on("code.diff", () => {
      bumpFileTreeVersion();
    });

    socket.on("connect_error", (err) => {
      if (err.message === "Authentication required" || err.message === "Invalid token") {
        clearToken();
        window.location.href = "/login";
      }
    });

    return () => {
      socket.off("message.new");
      socket.off("message.stream");
      socket.off("message.stream.end");
      socket.off("agent.status");
      socket.off("task.updated");
      socket.off("agent.created");
      socket.off("agent.updated");
      socket.off("agent.deleted");
      socket.off("code.diff");
      socket.off("connect_error");
    };
  }, [appendMessage, appendStreamToken, finalizeStream, updateAgentStatus, addAgent, updateAgent, removeAgent, upsertTask, bumpFileTreeVersion]);
}
