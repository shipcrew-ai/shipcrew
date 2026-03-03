import { create } from "zustand";
import type {
  Project,
  Channel,
  Message,
  Agent,
  Task,
  AgentStatus,
} from "@devteam/shared";

interface StreamingMessage {
  id: string;
  agentId: string;
  channelId: string;
  content: string;
}

interface AppState {
  // Project
  projects: Project[];
  activeProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project) => void;

  // Channels
  channels: Channel[];
  activeChannelId: string | null;
  setChannels: (channels: Channel[]) => void;
  setActiveChannelId: (id: string) => void;

  // Messages
  messagesByChannel: Record<string, Message[]>;
  setMessages: (channelId: string, messages: Message[]) => void;
  appendMessage: (message: Message) => void;
  clearMessages: () => void;

  // Streaming messages
  streamingMessages: Record<string, StreamingMessage>;
  appendStreamToken: (messageId: string, agentId: string, channelId: string, token: string) => void;
  finalizeStream: (messageId: string) => void;

  // Agents
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  updateAgentStatus: (agentId: string, status: AgentStatus, statusMessage: string | null) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;

  // Agent Editor
  agentEditorOpen: boolean;
  editingAgent: Agent | null;
  setAgentEditorOpen: (open: boolean) => void;
  setEditingAgent: (agent: Agent | null) => void;

  // New Project Dialog
  newProjectDialogOpen: boolean;
  setNewProjectDialogOpen: (open: boolean) => void;

  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  upsertTask: (task: Task) => void;

  // File Browser
  filesPanelOpen: boolean;
  setFilesPanelOpen: (open: boolean) => void;
  selectedFilePath: string | null;
  setSelectedFilePath: (path: string | null) => void;
  fileTreeVersion: number; // bumped on code.diff to trigger re-fetch
  bumpFileTreeVersion: () => void;

  // UI
  taskPanelOpen: boolean;
  setTaskPanelOpen: (open: boolean) => void;
  taskPanelTab: "kanban" | "scheduled";
  setTaskPanelTab: (tab: "kanban" | "scheduled") => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Project
  projects: [],
  activeProject: null,
  setProjects: (projects) => set({ projects }),
  setActiveProject: (project) => set({ activeProject: project }),

  // Channels
  channels: [],
  activeChannelId: null,
  setChannels: (channels) => set({ channels }),
  setActiveChannelId: (id) => set({ activeChannelId: id }),

  // Messages
  messagesByChannel: {},
  setMessages: (channelId, messages) =>
    set((s) => ({
      messagesByChannel: { ...s.messagesByChannel, [channelId]: messages },
    })),
  appendMessage: (message) =>
    set((s) => {
      const existing = s.messagesByChannel[message.channelId] ?? [];
      return {
        messagesByChannel: {
          ...s.messagesByChannel,
          [message.channelId]: [...existing, message],
        },
      };
    }),
  clearMessages: () => set({ messagesByChannel: {}, streamingMessages: {} }),

  // Streaming
  streamingMessages: {},
  appendStreamToken: (messageId, agentId, channelId, token) =>
    set((s) => {
      const existing = s.streamingMessages[messageId];
      return {
        streamingMessages: {
          ...s.streamingMessages,
          [messageId]: {
            id: messageId,
            agentId,
            channelId,
            content: (existing?.content ?? "") + token,
          },
        },
      };
    }),
  finalizeStream: (messageId) =>
    set((s) => {
      const { [messageId]: _, ...rest } = s.streamingMessages;
      return { streamingMessages: rest };
    }),

  // Agents
  agents: [],
  setAgents: (agents) => set({ agents }),
  updateAgentStatus: (agentId, status, statusMessage) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === agentId ? { ...a, status, statusMessage } : a
      ),
    })),
  addAgent: (agent) =>
    set((s) => {
      // Idempotent — prevent duplicates from socket + API race
      if (s.agents.some((a) => a.id === agent.id)) {
        return { agents: s.agents.map((a) => (a.id === agent.id ? agent : a)) };
      }
      return { agents: [...s.agents, agent] };
    }),
  updateAgent: (agent) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === agent.id ? agent : a)),
    })),
  removeAgent: (agentId) =>
    set((s) => ({
      agents: s.agents.filter((a) => a.id !== agentId),
    })),

  // Agent Editor
  agentEditorOpen: false,
  editingAgent: null,
  setAgentEditorOpen: (open) => set({ agentEditorOpen: open }),
  setEditingAgent: (agent) => set({ editingAgent: agent }),

  // New Project Dialog
  newProjectDialogOpen: false,
  setNewProjectDialogOpen: (open) => set({ newProjectDialogOpen: open }),

  // Tasks
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  upsertTask: (task) =>
    set((s) => {
      const exists = s.tasks.some((t) => t.id === task.id);
      return {
        tasks: exists
          ? s.tasks.map((t) => (t.id === task.id ? task : t))
          : [...s.tasks, task],
      };
    }),

  // File Browser
  filesPanelOpen: false,
  setFilesPanelOpen: (open) => set({ filesPanelOpen: open }),
  selectedFilePath: null,
  setSelectedFilePath: (path) => set({ selectedFilePath: path }),
  fileTreeVersion: 0,
  bumpFileTreeVersion: () => set((s) => ({ fileTreeVersion: s.fileTreeVersion + 1 })),

  // UI
  taskPanelOpen: false,
  setTaskPanelOpen: (open) => set({ taskPanelOpen: open }),
  taskPanelTab: "kanban",
  setTaskPanelTab: (tab) => set({ taskPanelTab: tab }),
  theme: (typeof window !== "undefined" && localStorage.getItem("theme") === "light" ? "light" : "dark") as "light" | "dark",
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
      }
      return { theme: next };
    }),
}));
