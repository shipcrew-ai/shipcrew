"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Project, Agent, Channel, Task } from "@devteam/shared";

interface ProjectFull extends Project {
  agents: Agent[];
  channels: Channel[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (project: ProjectFull) => void;
}

export function NewProjectDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const project = await apiFetch<ProjectFull>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      setName("");
      setDescription("");
      onCreated(project);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--color-backdrop,rgba(0,0,0,0.6))]" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-slack-sidebar border border-slack-border rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
        <h2 className="text-slack-heading text-lg font-bold mb-1">Create New Project</h2>
        <p className="text-slack-muted text-xs mb-5">
          Each project gets its own team of 5 AI agents, channels, and workspace folder.
        </p>

        <label className="block text-sm text-slack-text font-medium mb-1.5">
          Project Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Awesome App"
          autoFocus
          className="w-full bg-slack-input border border-slack-border rounded-lg px-3 py-2 text-sm text-slack-text placeholder-slack-muted outline-none focus:border-slack-active mb-4"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) handleCreate();
            if (e.key === "Escape") onClose();
          }}
        />

        <label className="block text-sm text-slack-text font-medium mb-1.5">
          Description <span className="text-slack-muted font-normal">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A brief description of what you're building..."
          rows={2}
          className="w-full bg-slack-input border border-slack-border rounded-lg px-3 py-2 text-sm text-slack-text placeholder-slack-muted outline-none focus:border-slack-active resize-none mb-4"
        />

        {error && (
          <p className="text-slack-red text-xs mb-3">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-slack-muted hover:text-slack-text rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="px-4 py-1.5 text-sm text-white bg-slack-active hover:bg-slack-active/80 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
