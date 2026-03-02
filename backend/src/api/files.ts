import { Router } from "express";
import { prisma } from "../db/client.js";
import path from "path";
import fs from "fs/promises";

export const filesRouter = Router();

// ─── Types ───────────────────────────────────────────────────────────────────

interface FileNode {
  name: string;
  path: string; // relative to sandbox root
  type: "file" | "directory";
  size?: number;
  modifiedAt?: string;
  children?: FileNode[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const IGNORED_PATTERNS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".cache",
  "dist",
  ".turbo",
  "__pycache__",
  ".DS_Store",
  "Thumbs.db",
]);

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB — don't read huge files
const MAX_DEPTH = 10;

async function buildFileTree(
  rootPath: string,
  currentPath: string,
  depth: number
): Promise<FileNode[]> {
  if (depth > MAX_DEPTH) return [];

  let entries;
  try {
    entries = await fs.readdir(currentPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: FileNode[] = [];

  // Sort: directories first, then files, alphabetical within each group
  const sorted = entries
    .filter((e) => !IGNORED_PATTERNS.has(e.name) && !e.name.startsWith("."))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  for (const entry of sorted) {
    const fullPath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);

    if (entry.isDirectory()) {
      const children = await buildFileTree(rootPath, fullPath, depth + 1);
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: "directory",
        children,
      });
    } else if (entry.isFile()) {
      try {
        const stat = await fs.stat(fullPath);
        nodes.push({
          name: entry.name,
          path: relativePath,
          type: "file",
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        });
      } catch {
        nodes.push({
          name: entry.name,
          path: relativePath,
          type: "file",
        });
      }
    }
  }

  return nodes;
}

function getLanguage(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".json": "json",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".md": "markdown",
    ".py": "python",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".rb": "ruby",
    ".php": "php",
    ".sql": "sql",
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".xml": "xml",
    ".svg": "xml",
    ".env": "shell",
    ".gitignore": "text",
    ".dockerignore": "text",
    ".prisma": "prisma",
  };
  return map[ext] ?? "text";
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/projects/:projectId/files — list file tree
filesRouter.get("/projects/:projectId/files", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId },
    select: { sandboxPath: true },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });

  try {
    await fs.access(project.sandboxPath);
  } catch {
    // Sandbox directory doesn't exist yet — empty project
    return res.json({ tree: [], rootPath: project.sandboxPath });
  }

  const tree = await buildFileTree(project.sandboxPath, project.sandboxPath, 0);
  res.json({ tree, rootPath: project.sandboxPath });
});

// GET /api/projects/:projectId/files/content?path=relative/path
filesRouter.get("/projects/:projectId/files/content", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId },
    select: { sandboxPath: true },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: "path query param required" });

  // Security: resolve and check that path is within sandbox
  const fullPath = path.resolve(project.sandboxPath, filePath);
  if (!fullPath.startsWith(path.resolve(project.sandboxPath))) {
    return res.status(403).json({ error: "Path outside sandbox" });
  }

  try {
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      return res.status(400).json({ error: "Cannot read directory as file" });
    }

    if (stat.size > MAX_FILE_SIZE) {
      return res.json({
        content: null,
        truncated: true,
        size: stat.size,
        language: getLanguage(filePath),
        message: `File too large (${(stat.size / 1024).toFixed(1)} KB). Max: ${MAX_FILE_SIZE / 1024} KB`,
      });
    }

    const content = await fs.readFile(fullPath, "utf-8");
    res.json({
      content,
      truncated: false,
      size: stat.size,
      language: getLanguage(filePath),
    });
  } catch (err) {
    return res.status(404).json({ error: "File not found" });
  }
});
