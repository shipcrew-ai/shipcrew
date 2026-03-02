"use client";

import { useState } from "react";
import { Todo } from "@/types/todo";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleToggle() {
    setToggling(true);
    try {
      await onToggle(todo.id, !todo.completed);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(todo.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <li
      className={`group flex items-center gap-3 rounded-lg border px-4 py-3 shadow-sm transition ${
        deleting ? "scale-95 opacity-0" : "opacity-100"
      } ${
        todo.completed
          ? "border-gray-100 bg-gray-50"
          : "border-gray-200 bg-white"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
          todo.completed
            ? "border-indigo-400 bg-indigo-400"
            : "border-gray-300 bg-white hover:border-indigo-400"
        } disabled:opacity-50`}
      >
        {todo.completed && (
          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Title */}
      <span
        className={`flex-1 text-sm transition ${
          todo.completed ? "text-gray-400 line-through" : "text-gray-800"
        }`}
      >
        {todo.title}
      </span>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Delete todo"
        className="ml-auto flex-shrink-0 rounded-md p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
      >
        {deleting ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        )}
      </button>
    </li>
  );
}
