"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { panelSlideVariants } from "@/lib/motion";

export function MiniTaskBoard() {
  const taskBoardPanelOpen = useAppStore((s) => s.taskBoardPanelOpen);
  const setTaskBoardPanelOpen = useAppStore((s) => s.setTaskBoardPanelOpen);

  return (
    <AnimatePresence>
      {taskBoardPanelOpen && (
        <motion.div
          variants={panelSlideVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="hud-panel-left pointer-events-auto flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)]">
            <span className="text-sm font-semibold text-slack-heading">Task Board</span>
            <button
              onClick={() => setTaskBoardPanelOpen(false)}
              className="text-slack-muted hover:text-slack-heading p-1 rounded hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Board */}
          <div className="flex-1 overflow-auto p-3">
            <KanbanBoard />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
