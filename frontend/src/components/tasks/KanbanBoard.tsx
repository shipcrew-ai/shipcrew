"use client";
import { motion } from "framer-motion";
import { useAppStore } from "@/store";
import { cardVariants, staggerContainer, staggerItem, hoverLift } from "@/lib/motion";
import type { Task, TaskStatus } from "@devteam/shared";

const COLUMNS: {
  status: TaskStatus;
  label: string;
  dotColor: string;
  textColor: string;
}[] = [
  { status: "todo", label: "To Do", dotColor: "bg-slack-muted", textColor: "text-slack-muted" },
  { status: "in_progress", label: "In Progress", dotColor: "bg-slack-blue", textColor: "text-slack-blue" },
  { status: "review", label: "In Review", dotColor: "bg-slack-yellow", textColor: "text-slack-yellow" },
  { status: "done", label: "Done", dotColor: "bg-slack-green", textColor: "text-slack-green" },
];

function TaskCard({ task }: { task: Task }) {
  const agents = useAppStore((s) => s.agents);
  const assignee = task.assigneeAgentId
    ? agents.find((a) => a.id === task.assigneeAgentId)
    : null;

  return (
    <motion.div
      variants={staggerItem}
      {...hoverLift}
      className="glass-surface rounded-xl p-3.5 space-y-2 hover:border-white/10 transition-colors cursor-default"
    >
      <p className="text-sm text-slack-text font-medium leading-snug">
        {task.title}
      </p>
      {task.description && (
        <p className="text-xs text-slack-muted leading-relaxed line-clamp-3">
          {task.description}
        </p>
      )}
      {assignee && (
        <div className="flex items-center gap-2 pt-0.5">
          <span
            className="w-5 h-5 rounded text-xs flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: assignee.color + "20" }}
          >
            {assignee.avatar}
          </span>
          <span className="text-xs text-slack-muted">{assignee.name}</span>
        </div>
      )}
    </motion.div>
  );
}

export function KanbanBoard() {
  const tasks = useAppStore((s) => s.tasks);

  return (
    <div className="p-5 space-y-5 h-full overflow-y-auto">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        if (colTasks.length === 0 && col.status === "done") return null;

        return (
          <div key={col.status}>
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`w-2 h-2 rounded-full ${col.dotColor}`}
                style={{ boxShadow: "0 0 6px currentColor" }}
              />
              <h3 className={`text-xs font-semibold uppercase tracking-wide ${col.textColor}`}>
                {col.label}
              </h3>
              <span className="text-[11px] glass-surface text-slack-muted px-1.5 py-0.5 rounded-full ml-1">
                {colTasks.length}
              </span>
            </div>

            {/* Cards */}
            {colTasks.length > 0 ? (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                {colTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </motion.div>
            ) : (
              <div className="text-xs text-slack-muted text-center py-3 border border-dashed border-[var(--glass-border)] rounded-xl">
                No tasks
              </div>
            )}
          </div>
        );
      })}

      {tasks.length === 0 && (
        <div className="text-center text-slack-muted text-sm py-12">
          <div className="text-3xl mb-3">📋</div>
          <p>No tasks yet</p>
          <p className="text-xs mt-1">Tasks will appear here when the PM creates them</p>
        </div>
      )}
    </div>
  );
}
