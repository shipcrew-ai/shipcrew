"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import { apiFetch } from "@/lib/api";
import { FileTree, type FileNode } from "./FileTree";
import { FileViewer } from "./FileViewer";
import { panelSlideVariants } from "@/lib/motion";

interface FileTreeResponse {
  tree: FileNode[];
  rootPath: string;
}

export function FilesPanel() {
  const {
    filesPanelOpen,
    setFilesPanelOpen,
    selectedFilePath,
    setSelectedFilePath,
    fileTreeVersion,
    activeProject,
  } = useAppStore();

  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTree = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<FileTreeResponse>(
        `/api/projects/${activeProject.id}/files`
      );
      setTree(res.tree);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  // Fetch on open + when files change
  useEffect(() => {
    if (filesPanelOpen) {
      fetchTree();
    }
  }, [filesPanelOpen, fileTreeVersion, fetchTree]);

  // Reset selection when project changes
  useEffect(() => {
    setSelectedFilePath(null);
    setTree([]);
  }, [activeProject?.id, setSelectedFilePath]);

  const fileCount = countFiles(tree);

  return (
    <AnimatePresence>
      {filesPanelOpen && (
        <motion.div
          variants={panelSlideVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="w-[520px] min-w-[400px] glass-surface rounded-l-2xl flex flex-col"
        >
          {/* Header */}
          <div className="h-12 flex items-center border-b border-[var(--glass-border)] px-4 gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <svg className="w-4 h-4 text-slack-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-sm font-semibold text-slack-heading">Project Files</span>
              {fileCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 glass-surface rounded-full text-slack-muted">
                  {fileCount}
                </span>
              )}
            </div>
            <button
              onClick={fetchTree}
              className="text-slack-muted hover:text-slack-heading p-1 rounded hover:bg-white/5 transition-colors"
              title="Refresh file tree"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => setFilesPanelOpen(false)}
              className="text-slack-muted hover:text-slack-heading p-1 rounded hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex min-h-0">
            {/* Tree sidebar */}
            <div className="w-48 min-w-[160px] border-r border-[var(--glass-border)] overflow-y-auto flex-shrink-0">
              {loading && tree.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-slack-muted">Loading files...</p>
                </div>
              ) : error ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              ) : (
                <FileTree
                  nodes={tree}
                  selectedPath={selectedFilePath}
                  onSelect={setSelectedFilePath}
                />
              )}
            </div>

            {/* File content viewer */}
            <div className="flex-1 flex flex-col min-w-0">
              {selectedFilePath && activeProject ? (
                <FileViewer
                  projectId={activeProject.id}
                  filePath={selectedFilePath}
                  fileTreeVersion={fileTreeVersion}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl mb-2">📄</div>
                    <p className="text-xs text-slack-muted">Select a file to view</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function countFiles(nodes: FileNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "file") count++;
    if (node.children) count += countFiles(node.children);
  }
  return count;
}
