"use client";

import { useEffect, useState, useCallback } from "react";
import { Todo } from "@/types/todo";
import { fetchTodos, createTodo, updateTodo, deleteTodo } from "@/lib/api";
import AddTodo from "@/components/AddTodo";
import TodoItem from "@/components/TodoItem";

type Filter = "all" | "active" | "completed";

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const loadTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTodos();
      setTodos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load todos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  async function handleAdd(title: string) {
    try {
      const newTodo = await createTodo(title);
      setTodos((prev) => [newTodo, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add todo.");
    }
  }

  async function handleToggle(id: number, completed: boolean) {
    try {
      const updated = await updateTodo(id, { completed });
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete todo.");
    }
  }

  const filteredTodos = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const completedCount = todos.filter((t) => t.completed).length;
  const activeCount = todos.length - completedCount;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          ✅ Todos
        </h1>
        {!loading && todos.length > 0 && (
          <p className="mt-1 text-sm text-gray-400">
            {activeCount} left · {completedCount} done
          </p>
        )}
      </div>

      {/* Add input */}
      <div className="mb-6">
        <AddTodo onAdd={handleAdd} disabled={loading} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto font-medium underline underline-offset-2 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter tabs */}
      {todos.length > 0 && (
        <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
          {(["all", "active", "completed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition ${
                filter === f
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Todo list */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <svg className="h-8 w-8 animate-spin text-indigo-300" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">Loading your todos…</span>
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
          <span className="text-4xl">
            {filter === "completed" ? "🎉" : filter === "active" ? "🏖️" : "📋"}
          </span>
          <p className="text-sm">
            {filter === "completed"
              ? "Nothing completed yet."
              : filter === "active"
              ? "All caught up!"
              : "No todos yet. Add one above!"}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}

      {/* Clear completed */}
      {completedCount > 0 && filter !== "active" && (
        <div className="mt-4 text-center">
          <button
            onClick={async () => {
              const completed = todos.filter((t) => t.completed);
              await Promise.all(completed.map((t) => handleDelete(t.id)));
            }}
            className="text-xs text-gray-400 underline underline-offset-2 hover:text-red-400"
          >
            Clear {completedCount} completed
          </button>
        </div>
      )}
    </div>
  );
}
