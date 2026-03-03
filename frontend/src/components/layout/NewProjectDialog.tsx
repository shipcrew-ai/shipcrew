"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { modalOverlayVariants, modalContentVariants } from "@/lib/motion";
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
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative glass-raised rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
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
              className="w-full bg-slack-input border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-slack-text placeholder-slack-muted outline-none focus:border-slack-active focus:shadow-[0_0_0_2px_var(--color-active-glow)] mb-4"
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
              className="w-full bg-slack-input border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-slack-text placeholder-slack-muted outline-none focus:border-slack-active focus:shadow-[0_0_0_2px_var(--color-active-glow)] resize-none mb-4"
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
                className="px-4 py-1.5 text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Creating..." : "Create Project"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
