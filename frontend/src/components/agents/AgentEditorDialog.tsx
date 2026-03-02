"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store";
import { apiFetch } from "@/lib/api";
import type { Agent, AgentSkill } from "@devteam/shared";
import { ALL_SKILLS } from "@devteam/shared";

const SKILL_LABELS: Record<AgentSkill, { label: string; description: string }> = {
  file_ops: {
    label: "File Operations",
    description: "Read, write, edit, and search project files",
  },
  task_management: {
    label: "Task Management",
    description: "Create, assign, and manage kanban tasks",
  },
  code_review: {
    label: "Code Review",
    description: "Review code and approve/reject tasks",
  },
  communication: {
    label: "Communication",
    description: "Send messages across channels",
  },
  memory: {
    label: "Memory",
    description: "Save and recall persistent notes",
  },
};

const PRESET_COLORS = [
  "#7C3AED", "#DB2777", "#0891B2", "#059669", "#D97706",
  "#DC2626", "#2563EB", "#7C3AED", "#EC4899", "#14B8A6",
];

const PRESET_AVATARS = [
  "🤖", "🧑‍💻", "👩‍💻", "👨‍💻", "🧑‍🔬", "🧑‍🎨", "🦊", "🐱", "🦉", "🐬",
  "🔧", "🎯", "🛡️", "📊", "🚀", "💡", "🔍", "📝", "🎨", "⚡",
];

export function AgentEditorDialog() {
  const {
    agentEditorOpen,
    editingAgent,
    setAgentEditorOpen,
    setEditingAgent,
    activeProject,
    channels,
    updateAgent,
    addAgent,
    removeAgent,
  } = useAppStore();

  const isNew = !editingAgent;
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [avatar, setAvatar] = useState("🤖");
  const [color, setColor] = useState("#7C3AED");
  const [mentionName, setMentionName] = useState("");
  const [role, setRole] = useState("custom");
  const [skills, setSkills] = useState<AgentSkill[]>(["file_ops", "communication", "memory"]);
  const [agentChannels, setAgentChannels] = useState<string[]>(["general"]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [generatedPromptPreview, setGeneratedPromptPreview] = useState("");
  const [usingAutoPrompt, setUsingAutoPrompt] = useState(false);
  const [timeoutMs, setTimeoutMs] = useState(120000);
  const [maxTurns, setMaxTurns] = useState(25);
  const [maxBudgetUsd, setMaxBudgetUsd] = useState(1.0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing an existing agent
  useEffect(() => {
    if (editingAgent) {
      setName(editingAgent.name);
      setTitle(editingAgent.title);
      setAvatar(editingAgent.avatar);
      setColor(editingAgent.color);
      setMentionName(editingAgent.mentionName ?? "");
      setRole(editingAgent.role);
      setSkills(editingAgent.skills as AgentSkill[]);
      setAgentChannels(editingAgent.channels);
      setTimeoutMs(editingAgent.timeoutMs);
      setMaxTurns(editingAgent.maxTurns);
      setMaxBudgetUsd(editingAgent.maxBudgetUsd);

      if (editingAgent.systemPrompt) {
        setSystemPrompt(editingAgent.systemPrompt);
        setUsingAutoPrompt(false);
        setGeneratedPromptPreview("");
      } else {
        // No custom prompt — fetch the auto-generated one for preview (read-only)
        setSystemPrompt("");
        setUsingAutoPrompt(true);
        if (activeProject) {
          apiFetch<{ generatedPrompt: string }>(
            `/api/projects/${activeProject.id}/agents/${editingAgent.id}/generated-prompt`
          )
            .then((res) => setGeneratedPromptPreview(res.generatedPrompt))
            .catch(() => setGeneratedPromptPreview(""));
        }
      }
    } else {
      setName("");
      setTitle("");
      setAvatar("🤖");
      setColor("#7C3AED");
      setMentionName("");
      setRole("custom");
      setSkills(["file_ops", "communication", "memory"]);
      setAgentChannels(["general"]);
      setSystemPrompt("");
      setUsingAutoPrompt(false);
      setGeneratedPromptPreview("");
      setTimeoutMs(120000);
      setMaxTurns(25);
      setMaxBudgetUsd(1.0);
    }
    setShowAdvanced(false);
    setError(null);
  }, [editingAgent, agentEditorOpen]);

  if (!agentEditorOpen || !activeProject) return null;

  const handleClose = () => {
    setAgentEditorOpen(false);
    setEditingAgent(null);
  };

  // Auto-generate mentionName from name
  const handleNameChange = (val: string) => {
    setName(val);
    if (isNew || editingAgent?.isCustom) {
      const auto = val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      setMentionName(auto);
    }
  };

  const toggleSkill = (skill: AgentSkill) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const toggleChannel = (ch: string) => {
    setAgentChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !title.trim() || !mentionName.trim()) return;
    if (skills.length === 0) {
      setError("Select at least one skill");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body = {
        name: name.trim(),
        title: title.trim(),
        avatar,
        color,
        mentionName: mentionName.trim(),
        role: isNew ? role : undefined,
        skills,
        channels: agentChannels,
        systemPrompt: systemPrompt.trim() || null,
        timeoutMs,
        maxTurns,
        maxBudgetUsd,
      };

      if (editingAgent) {
        // PATCH
        const updated = await apiFetch<Agent>(
          `/api/projects/${activeProject.id}/agents/${editingAgent.id}`,
          { method: "PATCH", body: JSON.stringify(body) }
        );
        updateAgent(updated);
      } else {
        // POST
        const created = await apiFetch<Agent>(
          `/api/projects/${activeProject.id}/agents`,
          { method: "POST", body: JSON.stringify({ ...body, role }) }
        );
        addAgent(created);
      }
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingAgent || !editingAgent.isCustom) return;
    if (!confirm(`Delete agent ${editingAgent.name}? This cannot be undone.`)) return;

    setLoading(true);
    try {
      await apiFetch(
        `/api/projects/${activeProject.id}/agents/${editingAgent.id}`,
        { method: "DELETE" }
      );
      removeAgent(editingAgent.id);
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPrompt = async () => {
    if (!editingAgent) return;
    setLoading(true);
    try {
      const result = await apiFetch<{ agent: Agent; generatedPrompt: string }>(
        `/api/projects/${activeProject.id}/agents/${editingAgent.id}/reset-prompt`,
        { method: "POST" }
      );
      setSystemPrompt("");
      updateAgent(result.agent);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[var(--color-backdrop,rgba(0,0,0,0.6))]" onClick={handleClose} />

      <div className="relative bg-slack-sidebar border border-slack-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-fade-in">
        <h2 className="text-slack-heading text-lg font-bold mb-1">
          {isNew ? "Add New Agent" : `Edit ${editingAgent.name}`}
        </h2>
        <p className="text-slack-muted text-xs mb-5">
          {isNew
            ? "Create a custom agent with specific skills and channels."
            : editingAgent.isCustom
              ? "Edit this custom agent's configuration."
              : "Edit this agent's configuration. Default agents cannot be deleted."}
        </p>

        {/* Name + Title */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-slack-text font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Alex"
              className="w-full bg-slack-input border border-slack-border rounded-lg px-3 py-2 text-sm text-slack-text placeholder-slack-muted outline-none focus:border-slack-active"
            />
          </div>
          <div>
            <label className="block text-xs text-slack-text font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="DevOps Engineer"
              className="w-full bg-slack-input border border-slack-border rounded-lg px-3 py-2 text-sm text-slack-text placeholder-slack-muted outline-none focus:border-slack-active"
            />
          </div>
        </div>

        {/* Mention Name */}
        <div className="mb-4">
          <label className="block text-xs text-slack-text font-medium mb-1">
            @mention handle
          </label>
          <div className="flex items-center gap-1">
            <span className="text-slack-muted text-sm">@</span>
            <input
              type="text"
              value={mentionName}
              onChange={(e) => setMentionName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="alex"
              className="flex-1 bg-slack-input border border-slack-border rounded-lg px-3 py-2 text-sm text-slack-text placeholder-slack-muted outline-none focus:border-slack-active"
            />
          </div>
        </div>

        {/* Avatar + Color */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-slack-text font-medium mb-1">Avatar</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setAvatar(emoji)}
                  className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-colors ${
                    avatar === emoji
                      ? "bg-slack-active ring-2 ring-slack-active"
                      : "bg-slack-input hover:bg-slack-hover"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-slack-text font-medium mb-1">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    color === c ? "ring-2 ring-slack-heading scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <label className="block text-xs text-slack-text font-medium mb-2">Skills</label>
          <div className="space-y-1.5">
            {ALL_SKILLS.map((skill) => {
              const def = SKILL_LABELS[skill];
              const isActive = skills.includes(skill);
              return (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center gap-3 ${
                    isActive
                      ? "border-slack-active bg-slack-active/10 text-slack-text"
                      : "border-slack-border bg-slack-input text-slack-muted hover:bg-slack-hover"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isActive ? "bg-slack-active border-slack-active" : "border-slack-border"
                    }`}
                  >
                    {isActive && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{def.label}</p>
                    <p className="text-[10px] text-slack-muted">{def.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Channels */}
        <div className="mb-4">
          <label className="block text-xs text-slack-text font-medium mb-2">Channels</label>
          <div className="flex flex-wrap gap-2">
            {channels.map((ch) => {
              const isActive = agentChannels.includes(ch.name);
              return (
                <button
                  key={ch.id}
                  onClick={() => toggleChannel(ch.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? "border-slack-active bg-slack-active/10 text-slack-text"
                      : "border-slack-border text-slack-muted hover:bg-slack-hover"
                  }`}
                >
                  #{ch.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* System Prompt */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slack-text font-medium">
              System Prompt
            </label>
            <div className="flex items-center gap-2">
              {usingAutoPrompt && !systemPrompt && (
                <span className="text-[10px] text-slack-green">Using auto-generated</span>
              )}
              {editingAgent && systemPrompt && (
                <button
                  onClick={handleResetPrompt}
                  className="text-[10px] text-slack-active hover:underline"
                >
                  Reset to Default
                </button>
              )}
            </div>
          </div>

          {/* Show auto-generated preview when no custom prompt */}
          {usingAutoPrompt && !systemPrompt && generatedPromptPreview ? (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slack-muted">Current auto-generated prompt:</span>
                <button
                  onClick={() => {
                    setSystemPrompt(generatedPromptPreview);
                    setUsingAutoPrompt(false);
                  }}
                  className="text-[10px] text-slack-active hover:underline"
                >
                  Edit as custom
                </button>
              </div>
              <div className="w-full bg-slack-input/50 border border-slack-border rounded-lg px-3 py-2 text-[10px] text-slack-muted font-mono max-h-40 overflow-y-auto whitespace-pre-wrap">
                {generatedPromptPreview}
              </div>
            </div>
          ) : (
            <textarea
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(e.target.value);
                setUsingAutoPrompt(false);
              }}
              placeholder="Leave empty for auto-generated prompt based on skills and channels..."
              rows={4}
              className="w-full bg-slack-input border border-slack-border rounded-lg px-3 py-2 text-xs text-slack-text placeholder-slack-muted outline-none focus:border-slack-active resize-none font-mono"
            />
          )}
        </div>

        {/* Advanced */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-slack-muted hover:text-slack-text mb-3 flex items-center gap-1"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced Settings
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[10px] text-slack-muted mb-1">Timeout (sec)</label>
              <input
                type="number"
                value={Math.round(timeoutMs / 1000)}
                onChange={(e) => setTimeoutMs(Math.max(10, parseInt(e.target.value) || 120) * 1000)}
                className="w-full bg-slack-input border border-slack-border rounded px-2 py-1.5 text-xs text-slack-text outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slack-muted mb-1">Max Turns</label>
              <input
                type="number"
                value={maxTurns}
                onChange={(e) => setMaxTurns(Math.max(1, parseInt(e.target.value) || 25))}
                className="w-full bg-slack-input border border-slack-border rounded px-2 py-1.5 text-xs text-slack-text outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slack-muted mb-1">Budget ($)</label>
              <input
                type="number"
                step="0.1"
                value={maxBudgetUsd}
                onChange={(e) => setMaxBudgetUsd(Math.max(0.1, parseFloat(e.target.value) || 1.0))}
                className="w-full bg-slack-input border border-slack-border rounded px-2 py-1.5 text-xs text-slack-text outline-none"
              />
            </div>
          </div>
        )}

        {error && <p className="text-slack-red text-xs mb-3">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div>
            {editingAgent?.isCustom && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-3 py-1.5 text-xs text-slack-red hover:bg-slack-red/10 rounded transition-colors"
              >
                Delete Agent
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-1.5 text-sm text-slack-muted hover:text-slack-text rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || !title.trim() || !mentionName.trim() || skills.length === 0 || loading}
              className="px-4 py-1.5 text-sm text-white bg-slack-active hover:bg-slack-active/80 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Saving..." : isNew ? "Create Agent" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
