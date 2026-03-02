"use client";
import { useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent } from "react";
import { getSocket } from "@/lib/socket";
import { useAppStore } from "@/store";
import { AgentAvatar } from "@/components/agents/AgentAvatar";

interface Props {
  channelId: string;
  projectId: string;
  channelName: string;
}

interface MentionTarget {
  name: string;
  label: string;
  description: string;
  agentId?: string;
}

export function MessageInput({ channelId, projectId, channelName }: Props) {
  const [value, setValue] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const agents = useAppStore((s) => s.agents);

  // Build dynamic mention targets from agents store
  const mentionTargets: MentionTarget[] = useMemo(() => {
    const targets: MentionTarget[] = [
      { name: "all", label: "All Agents", description: "Mention the entire team" },
    ];
    for (const a of agents) {
      const mentionKey = a.mentionName || a.name.toLowerCase();
      targets.push({
        name: mentionKey,
        label: a.name,
        description: a.title,
        agentId: a.id,
      });
    }
    return targets;
  }, [agents]);

  const filteredMentions = mentionTargets.filter((t) =>
    t.name.toLowerCase().startsWith(mentionFilter.toLowerCase())
  );

  // Reset mention index when filter changes
  useEffect(() => {
    setMentionIndex(0);
  }, [mentionFilter]);

  const insertMention = useCallback(
    (name: string) => {
      if (mentionStart < 0) return;
      const before = value.slice(0, mentionStart);
      const after = value.slice(
        textareaRef.current?.selectionStart ?? mentionStart + mentionFilter.length + 1
      );
      const newValue = `${before}@${name} ${after}`;
      setValue(newValue);
      setShowMentions(false);
      setMentionFilter("");
      setMentionStart(-1);

      // Focus and set cursor after mention
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          const cursorPos = before.length + name.length + 2; // +2 for @ and space
          el.focus();
          el.setSelectionRange(cursorPos, cursorPos);
        }
      });
    },
    [value, mentionStart, mentionFilter]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mention menu navigation
    if (showMentions && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredMentions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMentions[mentionIndex].name);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    // Regular send on Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPos);

    // Check if we're in an @mention context
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionFilter(atMatch[1]);
      setMentionStart(cursorPos - atMatch[0].length);
    } else {
      setShowMentions(false);
      setMentionFilter("");
      setMentionStart(-1);
    }
  };

  const send = () => {
    const content = value.trim();
    if (!content) return;

    getSocket().emit("message.send", { channelId, content, projectId });
    setValue("");
    setShowMentions(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  // Find agent data for avatar rendering
  const getAgentForMention = (target: MentionTarget) => {
    if (target.agentId) {
      return agents.find((a) => a.id === target.agentId);
    }
    return undefined;
  };

  return (
    <div className="px-4 pb-4 relative">
      {/* @mention autocomplete dropdown */}
      {showMentions && filteredMentions.length > 0 && (
        <div
          ref={menuRef}
          className="absolute bottom-full left-4 right-4 mb-1 bg-slack-sidebar border border-slack-border rounded-lg shadow-xl overflow-hidden z-50"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slack-muted uppercase tracking-wider border-b border-slack-border">
            Mention someone
          </div>
          {filteredMentions.map((target, i) => {
            const agent = getAgentForMention(target);
            return (
              <button
                key={target.name}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur
                  insertMention(target.name);
                }}
                onMouseEnter={() => setMentionIndex(i)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                  i === mentionIndex
                    ? "bg-slack-active text-slack-heading"
                    : "text-slack-text hover:bg-slack-hover"
                }`}
              >
                {target.name === "all" ? (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    @
                  </div>
                ) : agent ? (
                  <AgentAvatar agent={agent} size="sm" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slack-hover flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="text-sm font-medium">@{target.name}</span>
                  <span className="text-xs text-slack-muted ml-2">
                    {target.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-2 bg-slack-input border border-slack-border rounded-lg px-3 py-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={`Message #${channelName} — type @ to mention agents`}
          rows={1}
          className="flex-1 bg-transparent text-slack-text text-sm resize-none outline-none placeholder-slack-muted min-h-[24px] max-h-[160px] leading-6"
        />
        <button
          onClick={send}
          disabled={!value.trim()}
          className="flex-shrink-0 p-1.5 rounded text-slack-muted hover:text-slack-heading hover:bg-[var(--color-send-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
      <p className="text-[10px] text-slack-muted mt-1 pl-1">
        Enter to send · Shift+Enter for new line · Type <span className="text-slack-text">@</span> to mention agents
      </p>
    </div>
  );
}
