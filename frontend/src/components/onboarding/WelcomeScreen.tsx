"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Project, Channel, Agent } from "@devteam/shared";

interface ProjectFull extends Project {
  agents: Agent[];
  channels: Channel[];
}

interface WelcomeScreenProps {
  onProjectCreated: (project: ProjectFull) => void;
}

const AGENTS = [
  {
    emoji: "👩‍💼",
    name: "Priya",
    title: "Project Manager",
    color: "#7C3AED",
    description: "Breaks down requirements, creates tasks, tracks progress",
  },
  {
    emoji: "👩‍💻",
    name: "Luna",
    title: "Frontend Developer",
    color: "#DB2777",
    description: "Builds UI components with React and Next.js",
  },
  {
    emoji: "👨‍💻",
    name: "Marcus",
    title: "Backend Developer",
    color: "#0891B2",
    description: "Writes APIs, database logic, and server code",
  },
  {
    emoji: "🧑‍💻",
    name: "Jasper",
    title: "Fullstack Developer",
    color: "#059669",
    description: "Handles end-to-end features across the stack",
  },
  {
    emoji: "🔍",
    name: "Suki",
    title: "Code Reviewer",
    color: "#D97706",
    description: "Reviews code, catches bugs, suggests improvements",
  },
];

const STEPS = [
  {
    icon: "💬",
    title: "Describe what you want",
    description: "Tell your team what to build in plain English",
  },
  {
    icon: "📋",
    title: "Team breaks it down",
    description: "Priya creates a plan and assigns tasks to developers",
  },
  {
    icon: "🚀",
    title: "They build it together",
    description: "Devs write code, Suki reviews — all visible in real time",
  },
];

export function WelcomeScreen({ onProjectCreated }: WelcomeScreenProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const project = await apiFetch<ProjectFull>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      onProjectCreated(project);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Section 1: Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-[var(--color-heading)] mb-3">
            Your AI development team is ready
          </h1>
          <p className="text-[var(--color-muted)] max-w-xl mx-auto">
            ShipCrew gives you a team of specialized AI agents that work
            together to build software. Describe what you want, and they'll
            take it from there.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-20">
          {AGENTS.map((agent, index) => (
            <div
              key={agent.name}
              className="animate-fade-slide-up w-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center transition-transform hover:-translate-y-0.5 hover:shadow-lg"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-4xl mb-2">{agent.emoji}</div>
              <p className="font-semibold text-[var(--color-heading)]">
                {agent.name}
              </p>
              <p className="text-sm mb-1" style={{ color: agent.color }}>
                {agent.title}
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                {agent.description}
              </p>
            </div>
          ))}
        </div>

        {/* Section 2: How It Works */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-[var(--color-heading)] text-center mb-10">
            How It Works
          </h2>
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-6">
            {STEPS.map((step, index) => (
              <div key={step.title} className="flex items-start gap-6 sm:block sm:text-center max-w-xs">
                <div className="flex flex-col items-center gap-2 sm:mb-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-active)] text-white text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-3xl">{step.icon}</span>
                </div>
                <div>
                  <p className="font-semibold text-[var(--color-heading)] mb-1">
                    {step.title}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Create Project */}
        <div className="max-w-md mx-auto">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold text-[var(--color-heading)] mb-4 text-center">
              Start your first project
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  Project name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-active)] focus:border-transparent disabled:opacity-50"
                  placeholder="e.g., My Todo App, Blog API, Landing Page"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  Description{" "}
                  <span className="text-[var(--color-muted)] font-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-active)] focus:border-transparent resize-none disabled:opacity-50"
                  placeholder="What do you want to build?"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full py-2.5 px-4 rounded-md bg-[var(--color-active)] text-white font-medium hover:brightness-110 disabled:opacity-50 transition"
              >
                {loading
                  ? "Creating project..."
                  : "Create Project & Start Building →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
