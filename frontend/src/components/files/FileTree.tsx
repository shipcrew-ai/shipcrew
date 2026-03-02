"use client";
import { useState } from "react";
import clsx from "clsx";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modifiedAt?: string;
  children?: FileNode[];
}

interface FileTreeProps {
  nodes: FileNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth?: number;
}

const FILE_ICONS: Record<string, string> = {
  ts: "TS",
  tsx: "TX",
  js: "JS",
  jsx: "JX",
  json: "{}",
  html: "<>",
  css: "#",
  md: "M",
  py: "PY",
  rs: "RS",
  go: "GO",
  sql: "SQ",
  sh: "$",
  yaml: "Y",
  yml: "Y",
  toml: "T",
  env: "E",
  lock: "L",
  prisma: "P",
};

const FILE_COLORS: Record<string, string> = {
  ts: "text-blue-400",
  tsx: "text-blue-400",
  js: "text-yellow-400",
  jsx: "text-yellow-400",
  json: "text-yellow-600",
  html: "text-orange-400",
  css: "text-purple-400",
  md: "text-slate-400",
  py: "text-green-400",
  rs: "text-orange-500",
  go: "text-cyan-400",
};

function getFileExt(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ name }: { name: string }) {
  const ext = getFileExt(name);
  const icon = FILE_ICONS[ext];
  const color = FILE_COLORS[ext] ?? "text-slack-muted";

  if (icon) {
    return (
      <span className={clsx("text-[9px] font-bold w-4 text-center flex-shrink-0", color)}>
        {icon}
      </span>
    );
  }

  return (
    <svg className="w-3.5 h-3.5 text-slack-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function DirectoryNode({
  node,
  selectedPath,
  onSelect,
  depth,
}: {
  node: FileNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slack-hover transition-colors group"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <svg
          className={clsx(
            "w-3 h-3 text-slack-muted flex-shrink-0 transition-transform",
            expanded && "rotate-90"
          )}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <svg className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          {expanded ? (
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v1H4a1 1 0 00-1 1l-1 5V6z" />
          ) : (
            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
          )}
        </svg>
        <span className="text-xs text-slack-text truncate">{node.name}</span>
      </button>
      {expanded && node.children && (
        <FileTreeInner
          nodes={node.children}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={depth + 1}
        />
      )}
    </div>
  );
}

function FileLeaf({
  node,
  selectedPath,
  onSelect,
  depth,
}: {
  node: FileNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const isSelected = node.path === selectedPath;

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={clsx(
        "w-full text-left flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors",
        isSelected
          ? "bg-slack-active text-white"
          : "hover:bg-slack-hover text-slack-text"
      )}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
      title={node.size != null ? formatSize(node.size) : undefined}
    >
      <FileIcon name={node.name} />
      <span className="text-xs truncate">{node.name}</span>
    </button>
  );
}

function FileTreeInner({ nodes, selectedPath, onSelect, depth }: FileTreeProps) {
  return (
    <div>
      {nodes.map((node) =>
        node.type === "directory" ? (
          <DirectoryNode
            key={node.path}
            node={node}
            selectedPath={selectedPath}
            onSelect={onSelect}
            depth={depth ?? 0}
          />
        ) : (
          <FileLeaf
            key={node.path}
            node={node}
            selectedPath={selectedPath}
            onSelect={onSelect}
            depth={depth ?? 0}
          />
        )
      )}
    </div>
  );
}

export function FileTree({ nodes, selectedPath, onSelect }: Omit<FileTreeProps, "depth">) {
  if (nodes.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="text-2xl mb-2">📂</div>
        <p className="text-xs text-slack-muted">No files yet</p>
        <p className="text-[10px] text-slack-muted mt-1">
          Ask your team to build something!
        </p>
      </div>
    );
  }

  return (
    <div className="py-1">
      <FileTreeInner
        nodes={nodes}
        selectedPath={selectedPath}
        onSelect={onSelect}
        depth={0}
      />
    </div>
  );
}
