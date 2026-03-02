"use client";

import { useState, FormEvent } from "react";

interface AddTodoProps {
  onAdd: (title: string) => Promise<void>;
  disabled?: boolean;
}

export default function AddTodo({ onAdd, disabled }: AddTodoProps) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      await onAdd(trimmed);
      setTitle("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        disabled={disabled || loading}
        className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || loading || !title.trim()}
        className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-600 active:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Adding…
          </span>
        ) : (
          "Add"
        )}
      </button>
    </form>
  );
}
