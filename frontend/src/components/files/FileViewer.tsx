"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface FileContentResponse {
  content: string | null;
  truncated: boolean;
  size: number;
  language: string;
  message?: string;
}

interface FileViewerProps {
  projectId: string;
  filePath: string;
  fileTreeVersion: number;
}

function getLanguageLabel(lang: string): string {
  const labels: Record<string, string> = {
    typescript: "TypeScript",
    javascript: "JavaScript",
    json: "JSON",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    markdown: "Markdown",
    python: "Python",
    rust: "Rust",
    go: "Go",
    java: "Java",
    ruby: "Ruby",
    php: "PHP",
    sql: "SQL",
    shell: "Shell",
    yaml: "YAML",
    toml: "TOML",
    xml: "XML",
    prisma: "Prisma",
    text: "Text",
  };
  return labels[lang] ?? lang;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileViewer({ projectId, filePath, fileTreeVersion }: FileViewerProps) {
  const [data, setData] = useState<FileContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<FileContentResponse>(
      `/api/projects/${projectId}/files/content?path=${encodeURIComponent(filePath)}`
    )
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, filePath, fileTreeVersion]);

  const fileName = filePath.split("/").pop() ?? filePath;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slack-muted text-xs">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-1">⚠️</div>
          <p className="text-slack-muted text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (data.truncated) {
    return (
      <div className="flex-1 flex flex-col">
        <FileHeader fileName={fileName} language={data.language} size={data.size} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg mb-1">📦</div>
            <p className="text-slack-muted text-xs">{data.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <FileHeader fileName={fileName} language={data.language} size={data.size} />
      <div className="flex-1 overflow-auto">
        <pre className="text-xs leading-5 font-mono p-3 min-w-0">
          <code>
            {data.content?.split("\n").map((line, i) => (
              <div key={i} className="flex hover:bg-white/[0.02]">
                <span className="text-slack-muted select-none w-10 text-right pr-3 flex-shrink-0 inline-block opacity-40">
                  {i + 1}
                </span>
                <span className="text-slack-text whitespace-pre-wrap break-all">{line || " "}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

function FileHeader({
  fileName,
  language,
  size,
}: {
  fileName: string;
  language: string;
  size: number;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--glass-border)] glass-surface flex-shrink-0">
      <span className="text-xs font-medium text-slack-heading truncate">{fileName}</span>
      <span className="text-[10px] px-1.5 py-0.5 glass-surface rounded-full text-slack-muted flex-shrink-0">
        {getLanguageLabel(language)}
      </span>
      <span className="text-[10px] text-slack-muted flex-shrink-0">
        {formatSize(size)}
      </span>
    </div>
  );
}
