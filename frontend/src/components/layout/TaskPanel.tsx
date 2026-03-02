"use client";
import clsx from "clsx";
import { useAppStore } from "@/store";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";

export function TaskPanel() {
  const { taskPanelOpen, taskPanelTab, setTaskPanelTab, setTaskPanelOpen } =
    useAppStore();

  if (!taskPanelOpen) return null;

  return (
    <div className="w-[480px] min-w-[400px] border-l border-slack-border bg-slack-bg flex flex-col">
      {/* Header */}
      <div className="h-12 flex items-center border-b border-slack-border px-5 gap-4">
        <div className="flex items-center gap-4 flex-1">
          {(["kanban", "scheduled"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTaskPanelTab(tab)}
              className={clsx(
                "text-sm font-medium pb-0.5 border-b-2 transition-colors",
                taskPanelTab === tab
                  ? "text-slack-heading border-slack-active"
                  : "text-slack-muted border-transparent hover:text-slack-text"
              )}
            >
              {tab === "kanban" ? "Task Board" : "Scheduled"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setTaskPanelOpen(false)}
          className="text-slack-muted hover:text-slack-heading p-1 rounded hover:bg-slack-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {taskPanelTab === "kanban" ? (
          <KanbanBoard />
        ) : (
          <div className="p-5 text-slack-muted text-sm">
            Scheduled tasks coming soon...
          </div>
        )}
      </div>
    </div>
  );
}
