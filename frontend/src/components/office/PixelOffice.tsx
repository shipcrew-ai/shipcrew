"use client";
import {
  useEffect,
  useRef,
  useCallback,
  useState,
  type CSSProperties,
} from "react";
import { useAppStore } from "@/store";
import type { Agent, Channel } from "@devteam/shared";
import {
  TILE,
  CANVAS_W,
  CANVAS_H,
  CANVAS_COLS,
  CANVAS_ROWS,
  DESK_SLOTS,
  MEETING_SEATS,
  STOVE_SLOTS,
  DINING_SEATS,
  BED_SLOTS,
  SOFA_SLOTS,
  COFFEE_POS,
  HALLWAY_BOUNDS,
  WHITEBOARD_POS,
  findPath,
  simplifyPath,
  drawFloors,
  drawWalls,
  drawRoomLabels,
  drawAllStaticDecor,
  drawSpriteAssets,
  collectFurnitureDrawables,
  drawDesk,
  drawChair,
  drawCharacter,
  drawSleepingCharacter,
  drawCookingCharacter,
  drawZzz,
  drawThoughtBubble,
  drawErrorIndicator,
  drawNameTag,
  drawStatusDot,
  drawNeedsBar,
  loadOfficeAssets,
  withAlpha,
  type Drawable,
  type OfficeAssets,
} from "./sprites";

// ═══════════════════════════════════════════════════════════
// LIFE SIMULATION — Needs System
// ═══════════════════════════════════════════════════════════

interface AgentNeeds {
  energy: number;  // 0-100
  hunger: number;  // 0-100
  social: number;  // 0-100
}

// Decay per frame at ~60fps
const DECAY = { energy: 0.018, hunger: 0.014, social: 0.009 };
// Recovery per frame while performing activity
const RECOVER = { sleep: 0.18, eat: 0.22, cook: 0.05, chat: 0.12, coffee: 0.10 };
// Thresholds
const URGENT = 25;
const LOW = 45;

type IdleActivity = "sleep" | "cook" | "relax" | "eat" | "wander" | "coffee" | "chat";

// ═══════════════════════════════════════════════════════════
// AGENT STATE
// ═══════════════════════════════════════════════════════════

interface AgentState {
  x: number;
  y: number;
  path: { c: number; r: number }[];  // BFS path tiles to follow
  pathIdx: number;
  walkFrame: number;
  frameCounter: number;
  needs: AgentNeeds;
  idleActivity: IdleActivity | null;
  activitySlot: number;
  arrived: boolean;
  lastStatus: string;
  activityTimer: number;   // frames until next activity decision
  stuckFrames: number;     // frames spent unable to move
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

interface ClickRegion {
  x: number; y: number; w: number; h: number;
  type: "agent" | "monitor" | "whiteboard";
  id: string;
}

interface HoverCard {
  key: string;
  title: string;
  subtitle: string;
  color: string;
  type: ClickRegion["type"];
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  color: string;
}

function regionKey(region: ClickRegion): string {
  return `${region.type}:${region.id}`;
}

function regionColor(region: ClickRegion, agents: Agent[]): string {
  if (region.type === "whiteboard") return "#f59e0b";
  if (region.type === "monitor") {
    return agents.find((agent) => agent.id === region.id)?.color ?? "#38bdf8";
  }
  return agents.find((agent) => agent.id === region.id)?.color ?? "#f8fafc";
}

function describeRegion(
  region: ClickRegion,
  agents: Agent[],
  channels: Channel[],
): HoverCard {
  if (region.type === "agent") {
    const agent = agents.find((item) => item.id === region.id);
    return {
      key: regionKey(region),
      title: agent ? `${agent.avatar} ${agent.name}` : "Agent",
      subtitle: agent ? `${agent.title} · click to inspect` : "Click to inspect",
      color: agent?.color ?? "#f8fafc",
      type: region.type,
    };
  }

  if (region.type === "monitor") {
    const agent = agents.find((item) => item.id === region.id);
    const targetChannel = agent
      ? channels.find((channel) => agent.channels.includes(channel.name))
      : null;
    return {
      key: regionKey(region),
      title: agent ? `${agent.name}'s desk` : "Desk monitor",
      subtitle: `Open ${targetChannel ? `#${targetChannel.name}` : "#general"} chat`,
      color: agent?.color ?? "#38bdf8",
      type: region.type,
    };
  }

  return {
    key: regionKey(region),
    title: "Task board",
    subtitle: "Open planning and assignments",
    color: "#f59e0b",
    type: region.type,
  };
}

function drawRegionHighlight(
  ctx: CanvasRenderingContext2D,
  region: ClickRegion,
  frame: number,
  color: string,
  emphasis = 1,
) {
  const pad = region.type === "agent" ? 4 + emphasis : 3 + emphasis;
  const pulse = 0.08 + ((Math.sin(frame * 0.12) + 1) / 2) * 0.16;
  const x = region.x - pad;
  const y = region.y - pad;
  const w = region.w + pad * 2;
  const h = region.h + pad * 2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = emphasis > 1 ? 2 : 1;
  ctx.fillStyle = withAlpha(color, Math.min(0.24, pulse + emphasis * 0.03));
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = withAlpha(color, 0.85);
  ctx.fillRect(x - 1, y - 1, 3, 3);
  ctx.fillRect(x + w - 2, y - 1, 3, 3);
  ctx.fillRect(x - 1, y + h - 2, 3, 3);
  ctx.fillRect(x + w - 2, y + h - 2, 3, 3);
  ctx.restore();
}

function tileOf(px: number): number {
  return Math.max(0, Math.min(Math.floor(px / TILE), CANVAS_COLS - 1));
}
function rowOf(py: number): number {
  return Math.max(0, Math.min(Math.floor(py / TILE), CANVAS_ROWS - 1));
}

// Get an unused slot index for an activity
function getSlot(agents: Agent[], states: Map<string, AgentState>, activity: IdleActivity, myId: string): number {
  const used = new Set<number>();
  for (const a of agents) {
    if (a.id === myId) continue;
    const s = states.get(a.id);
    if (s && s.idleActivity === activity) used.add(s.activitySlot);
  }
  for (let i = 0; ; i++) { if (!used.has(i)) return i; }
}

// Target position for an activity + slot
function getActivityTarget(activity: IdleActivity, slot: number): { x: number; y: number } {
  switch (activity) {
    case "sleep":  { const b = BED_SLOTS[slot % BED_SLOTS.length]; return { x: b.x + 6, y: b.y + 4 }; }
    case "cook":   { const s = STOVE_SLOTS[slot % STOVE_SLOTS.length]; return { x: s.x, y: s.y + 2 }; }
    case "relax":  { const s = SOFA_SLOTS[slot % SOFA_SLOTS.length]; return { x: s.x, y: s.y + 4 }; }
    case "eat":    { const d = DINING_SEATS[slot % DINING_SEATS.length]; return { x: d.x, y: d.y + 4 }; }
    case "coffee":  return { x: COFFEE_POS.x, y: COFFEE_POS.y + TILE + 2 };
    case "chat": {
      const hb = HALLWAY_BOUNDS;
      return {
        x: hb.minX + Math.random() * (hb.maxX - hb.minX),
        y: hb.minY + Math.random() * (hb.maxY - hb.minY),
      };
    }
    case "wander": {
      const hb = HALLWAY_BOUNDS;
      return {
        x: hb.minX + Math.random() * (hb.maxX - hb.minX),
        y: hb.minY + Math.random() * (hb.maxY - hb.minY),
      };
    }
  }
}

// Choose idle activity based on needs
function chooseActivity(needs: AgentNeeds): IdleActivity {
  if (needs.energy < URGENT) return "sleep";
  if (needs.hunger < URGENT) return "eat";
  if (needs.social < URGENT) return "chat";
  if (needs.energy < LOW) return "coffee";
  if (needs.hunger < LOW) return "cook";
  if (needs.social < LOW) return "chat";

  // All needs OK — random
  const pool: IdleActivity[] = ["wander", "relax", "wander", "coffee"];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Navigate: compute BFS path from current pos to target pos
function navigateTo(st: AgentState, tx: number, ty: number) {
  const sc = tileOf(st.x), sr = rowOf(st.y);
  const ec = tileOf(tx), er = rowOf(ty);
  const raw = findPath(sc, sr, ec, er);
  if (raw.length === 0) {
    // No path found — agent stays put, will retry next cycle
    st.arrived = true;
    st.stuckFrames++;
    return;
  }
  st.path = simplifyPath(raw);
  st.pathIdx = 0;
  st.arrived = false;
  st.stuckFrames = 0;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function PixelOffice() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef<Agent[]>([]);
  const channelsRef = useRef<Channel[]>([]);
  const statesRef = useRef<Map<string, AgentState>>(new Map());
  const clickRegionsRef = useRef<ClickRegion[]>([]);
  const frameRef = useRef(0);
  const assetsRef = useRef<OfficeAssets>({ cats: null, plants: null, flowers: null, sofa: null });
  const hoveredRegionKeyRef = useRef<string | null>(null);
  const selectedAgentIdRef = useRef<string | null>(null);
  const rippleTimeoutsRef = useRef<number[]>([]);

  const agents = useAppStore((s) => s.agents);
  const selectedAgentId = useAppStore((s) => s.selectedAgentId);
  const setSelectedAgentId = useAppStore((s) => s.setSelectedAgentId);
  const setChatPanelOpen = useAppStore((s) => s.setChatPanelOpen);
  const setActiveChannelId = useAppStore((s) => s.setActiveChannelId);
  const setTaskBoardPanelOpen = useAppStore((s) => s.setTaskBoardPanelOpen);
  const channels = useAppStore((s) => s.channels);
  const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { channelsRef.current = channels; }, [channels]);
  useEffect(() => { selectedAgentIdRef.current = selectedAgentId; }, [selectedAgentId]);

  // Load sprite assets
  useEffect(() => {
    loadOfficeAssets().then((a) => { assetsRef.current = a; });
  }, []);

  useEffect(() => {
    const hoveredKey = hoveredRegionKeyRef.current;
    if (!hoveredKey) return;
    const region = clickRegionsRef.current.find((item) => regionKey(item) === hoveredKey);
    if (region) {
      setHoverCard(describeRegion(region, agents, channels));
    }
  }, [agents, channels]);

  useEffect(() => {
    return () => {
      rippleTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  // Coordinate mapping (object-fit: contain)
  const canvasToPixel = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const ca = canvas.width / canvas.height;
    const ra = rect.width / rect.height;
    let dW: number, dH: number, oX: number, oY: number;
    if (ra > ca) { dH = rect.height; dW = dH * ca; oX = (rect.width - dW) / 2; oY = 0; }
    else { dW = rect.width; dH = dW / ca; oX = 0; oY = (rect.height - dH) / 2; }
    return {
      x: Math.floor(((e.clientX - rect.left - oX) / dW) * canvas.width),
      y: Math.floor(((e.clientY - rect.top - oY) / dH) * canvas.height),
    };
  }, []);

  const setStagePointer = useCallback((x: number, y: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.setProperty("--pan-x", `${(((x / CANVAS_W) - 0.5) * 18).toFixed(2)}px`);
    stage.style.setProperty("--pan-y", `${(((y / CANVAS_H) - 0.5) * 14).toFixed(2)}px`);
    stage.style.setProperty("--hover-x", `${((x / CANVAS_W) * 100).toFixed(2)}%`);
    stage.style.setProperty("--hover-y", `${((y / CANVAS_H) * 100).toFixed(2)}%`);
  }, []);

  const clearStagePointer = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.setProperty("--pan-x", "0px");
    stage.style.setProperty("--pan-y", "0px");
    stage.style.setProperty("--hover-x", "50%");
    stage.style.setProperty("--hover-y", "50%");
  }, []);

  const spawnRipple = useCallback((x: number, y: number, color: string) => {
    const id = Date.now() + Math.random();
    setRipples((current) => [
      ...current.slice(-2),
      { id, x: (x / CANVAS_W) * 100, y: (y / CANVAS_H) * 100, color },
    ]);

    const timeoutId = window.setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== id));
      rippleTimeoutsRef.current = rippleTimeoutsRef.current.filter(
        (activeTimeoutId) => activeTimeoutId !== timeoutId,
      );
    }, 700);

    rippleTimeoutsRef.current.push(timeoutId);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = canvasToPixel(e);
      for (const r of clickRegionsRef.current) {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          spawnRipple(x, y, regionColor(r, agentsRef.current));
          if (r.type === "agent") setSelectedAgentId(r.id);
          else if (r.type === "monitor") {
            const agent = agentsRef.current.find((a) => a.id === r.id);
            if (agent) {
              const ch = channelsRef.current.find((c) => agent.channels.includes(c.name));
              const general = channelsRef.current.find((c) => c.name === "general");
              const target = ch || general;
              if (target) setActiveChannelId(target.id);
              setChatPanelOpen(true);
            }
          } else if (r.type === "whiteboard") setTaskBoardPanelOpen(true);
          return;
        }
      }
    },
    [
      canvasToPixel,
      setSelectedAgentId,
      setChatPanelOpen,
      setActiveChannelId,
      setTaskBoardPanelOpen,
      spawnRipple,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = canvasToPixel(e);
      setStagePointer(x, y);

      const hit = clickRegionsRef.current.find(
        (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
      );

      e.currentTarget.style.cursor = hit ? "pointer" : "auto";

      const nextKey = hit ? regionKey(hit) : null;
      if (nextKey === hoveredRegionKeyRef.current) return;

      hoveredRegionKeyRef.current = nextKey;
      setHoverCard(
        hit ? describeRegion(hit, agentsRef.current, channelsRef.current) : null,
      );
    },
    [canvasToPixel, setStagePointer],
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      hoveredRegionKeyRef.current = null;
      setHoverCard(null);
      e.currentTarget.style.cursor = "auto";
      clearStagePointer();
    },
    [clearStagePointer],
  );

  // ── Render loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    let animId: number;

    function render() {
      const frame = frameRef.current++;
      const agents = agentsRef.current;
      const states = statesRef.current;
      const assets = assetsRef.current;
      const regions: ClickRegion[] = [];
      const activeCookers = new Set<string>();

      // ── Update each agent ──
      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        const desk = DESK_SLOTS[i % DESK_SLOTS.length];

        let st = states.get(agent.id);
        if (!st) {
          const sx = desk.x + 6, sy = desk.y + TILE + 4;
          st = {
            x: sx, y: sy,
            path: [], pathIdx: 0,
            walkFrame: 0, frameCounter: 0,
            needs: { energy: 70 + Math.random() * 30, hunger: 60 + Math.random() * 40, social: 50 + Math.random() * 50 },
            idleActivity: null, activitySlot: 0,
            arrived: true,
            lastStatus: agent.status,
            activityTimer: 60 + Math.floor(Math.random() * 120),
            stuckFrames: 0,
          };
          states.set(agent.id, st);
        }

        st.frameCounter++;

        // ── Needs decay (always) ──
        st.needs.energy = Math.max(0, st.needs.energy - DECAY.energy);
        st.needs.hunger = Math.max(0, st.needs.hunger - DECAY.hunger);
        st.needs.social = Math.max(0, st.needs.social - DECAY.social);

        // ── Needs recovery (based on current activity) ──
        if (st.arrived) {
          if (st.idleActivity === "sleep") st.needs.energy = Math.min(100, st.needs.energy + RECOVER.sleep);
          if (st.idleActivity === "eat" || st.idleActivity === "cook") st.needs.hunger = Math.min(100, st.needs.hunger + RECOVER.eat);
          if (st.idleActivity === "cook") st.needs.hunger = Math.min(100, st.needs.hunger + RECOVER.cook);
          if (st.idleActivity === "chat") st.needs.social = Math.min(100, st.needs.social + RECOVER.chat);
          if (st.idleActivity === "coffee") st.needs.energy = Math.min(100, st.needs.energy + RECOVER.coffee);
          if (st.idleActivity === "relax") {
            st.needs.energy = Math.min(100, st.needs.energy + 0.04);
            st.needs.social = Math.min(100, st.needs.social + 0.03);
          }
        }

        // ── Social boost near other agents ──
        for (const other of agents) {
          if (other.id === agent.id) continue;
          const os = states.get(other.id);
          if (!os) continue;
          const dx = st.x - os.x, dy = st.y - os.y;
          if (Math.sqrt(dx * dx + dy * dy) < 48) {
            st.needs.social = Math.min(100, st.needs.social + 0.005);
          }
        }

        // ── Status change detection → force repath ──
        const statusChanged = st.lastStatus !== agent.status;
        st.lastStatus = agent.status;

        // ── Activity decision ──
        if (agent.status === "working" || agent.status === "error") {
          const seatX = desk.x + 6, seatY = desk.y + TILE + 4;
          if (statusChanged || st.idleActivity !== null) {
            st.idleActivity = null;
            navigateTo(st, seatX, seatY);
          }
        } else if (agent.status === "thinking") {
          const seat = MEETING_SEATS[i % MEETING_SEATS.length];
          const seatX = seat.x + 6, seatY = seat.y + TILE + 4;
          if (statusChanged || st.idleActivity !== null) {
            st.idleActivity = null;
            navigateTo(st, seatX, seatY);
          }
        } else if (agent.status === "idle") {
          st.activityTimer--;
          if (st.activityTimer <= 0 && st.arrived) {
            const activity = chooseActivity(st.needs);
            const slot = getSlot(agents, states, activity, agent.id);
            const target = getActivityTarget(activity, slot);

            st.idleActivity = activity;
            st.activitySlot = slot;
            navigateTo(st, target.x, target.y);

            // Time until next decision
            st.activityTimer = 300 + Math.floor(Math.random() * 300); // 5-10s
          }
          // If stuck for too long, force a new activity
          if (st.stuckFrames > 60) {
            st.activityTimer = 0;
            st.stuckFrames = 0;
          }
          // If a need becomes urgent mid-activity, interrupt
          if (st.arrived && st.idleActivity !== null) {
            const n = st.needs;
            if (n.energy < URGENT && st.idleActivity !== "sleep" && st.idleActivity !== "coffee") {
              st.activityTimer = 0;
            }
            if (n.hunger < URGENT && st.idleActivity !== "eat" && st.idleActivity !== "cook") {
              st.activityTimer = 0;
            }
            if (st.idleActivity === "sleep" && n.energy > 85) st.activityTimer = 0;
            if ((st.idleActivity === "eat" || st.idleActivity === "cook") && n.hunger > 85) st.activityTimer = 0;
            if (st.idleActivity === "chat" && n.social > 75) st.activityTimer = 0;
            if (st.idleActivity === "coffee" && n.energy > 70) st.activityTimer = 0;
          }
        }

        // ── Movement along BFS path ──
        if (st.pathIdx < st.path.length) {
          const target = st.path[st.pathIdx];
          const tx = target.c * TILE + TILE / 2;
          const ty = target.r * TILE + TILE / 2;
          const dx = tx - st.x;
          const dy = ty - st.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 2) {
            const speed = 1.2;
            st.x += (dx / dist) * speed;
            st.y += (dy / dist) * speed;
            // Sine wobble (only during walking)
            st.y += Math.sin(frame * 0.1) * 0.35;
            st.walkFrame = Math.floor(frame / 10) % 2;
          } else {
            st.x = tx;
            st.y = ty;
            st.pathIdx++;
            if (st.pathIdx >= st.path.length) {
              st.arrived = true;
              st.walkFrame = 0;
            }
          }
        } else if (!st.arrived) {
          st.arrived = true;
          st.walkFrame = 0;
        }

        // Track cookers
        if (st.idleActivity === "cook" && st.arrived) activeCookers.add(agent.id);
      }

      // ════════════════════════════
      // RENDER
      // ════════════════════════════

      ctx.fillStyle = "#2A231A";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      drawFloors(ctx);
      drawWalls(ctx);
      drawRoomLabels(ctx);
      drawAllStaticDecor(ctx, frame);

      // Loaded sprite assets (static frame 0)
      drawSpriteAssets(ctx, assets);

      // Whiteboard click region
      regions.push({
        x: WHITEBOARD_POS.x, y: WHITEBOARD_POS.y,
        w: 34, h: 24,
        type: "whiteboard", id: "whiteboard",
      });

      // ── Y-sorted drawables ──
      const drawables: Drawable[] = collectFurnitureDrawables(ctx, frame, activeCookers, assets);

      // Desks + chairs
      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        const desk = DESK_SLOTS[i % DESK_SLOTS.length];
        const isWorking = agent.status === "working";
        const isError = agent.status === "error";
        const glow = isWorking ? agent.color : isError ? "#ef4444" : null;

        drawables.push({
          y: desk.y + TILE + 2,
          draw: () => drawChair(ctx, desk.x, desk.y + TILE + 6),
        });
        drawables.push({
          y: desk.y,
          draw: () => {
            drawDesk(ctx, desk.x, desk.y, glow);
            regions.push({ x: desk.x + 5, y: desk.y - 14, w: 18, h: 12, type: "monitor", id: agent.id });
          },
        });
      }

      // ── Agent sprites ──
      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        const st = states.get(agent.id);
        if (!st) continue;
        const cx = Math.round(st.x);
        const cy = Math.round(st.y);

        drawables.push({
          y: cy + 10,
          draw: () => {
            const isSeated = st.arrived && (
              agent.status === "working" || agent.status === "error" || agent.status === "thinking" ||
              st.idleActivity === "relax" || st.idleActivity === "eat"
            );

            if (st.idleActivity === "sleep" && st.arrived) {
              drawSleepingCharacter(ctx, cx, cy + 4, agent.color);
              drawZzz(ctx, cx + 12, cy, frame);
            } else if (st.idleActivity === "cook" && st.arrived) {
              drawCookingCharacter(ctx, cx, cy, agent.color, frame);
            } else {
              drawCharacter(ctx, cx, cy, agent.color, st.walkFrame, isSeated);
            }

            if (agent.status === "thinking") drawThoughtBubble(ctx, cx, cy, frame);
            if (agent.status === "error") drawErrorIndicator(ctx, cx, cy, frame);

            // Needs bars
            const barY = (st.idleActivity === "sleep" && st.arrived) ? cy - 4 : cy - 16;
            drawNeedsBar(ctx, cx, barY, st.needs.energy, st.needs.hunger);

            // Name tag + status dot
            const tagY = barY - 8;
            drawNameTag(ctx, cx, tagY, agent.name, agent.avatar);
            drawStatusDot(ctx, cx + 14, tagY + 1, agent.status, frame);

            // Click region
            regions.push({ x: cx, y: cy, w: 16, h: 22, type: "agent", id: agent.id });
          },
        });
      }

      // Sort & draw
      drawables.sort((a, b) => a.y - b.y);
      for (const d of drawables) d.draw();

      const selectedId = selectedAgentIdRef.current;
      const selectedRegion = selectedId
        ? regions.find((region) => region.type === "agent" && region.id === selectedId)
        : null;
      if (selectedRegion) {
        const selectedAgent = agents.find((agent) => agent.id === selectedRegion.id);
        drawRegionHighlight(
          ctx,
          selectedRegion,
          frame,
          selectedAgent?.color ?? "#f8fafc",
          2,
        );
      }

      const hoveredKey = hoveredRegionKeyRef.current;
      if (hoveredKey) {
        const hoveredRegion = regions.find((region) => regionKey(region) === hoveredKey);
        if (hoveredRegion && (!selectedRegion || regionKey(selectedRegion) !== hoveredKey)) {
          drawRegionHighlight(
            ctx,
            hoveredRegion,
            frame,
            regionColor(hoveredRegion, agents),
          );
        }
      }

      clickRegionsRef.current = regions;
      animId = requestAnimationFrame(render);
    }

    render();
    return () => {
      cancelAnimationFrame(animId);
      if (canvasRef.current) canvasRef.current.style.cursor = "auto";
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="pixel-office-stage"
      style={
        {
          "--pan-x": "0px",
          "--pan-y": "0px",
          "--hover-x": "50%",
          "--hover-y": "50%",
        } as CSSProperties
      }
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="pixel-canvas pixel-office-canvas"
        aria-label="Interactive pixel office"
      />

      {hoverCard && (
        <div
          className="office-tooltip pointer-events-none"
          style={
            {
              left: "var(--hover-x)",
              top: "var(--hover-y)",
              "--office-tooltip-tone": hoverCard.color,
            } as CSSProperties
          }
        >
          <p className="text-[9px] uppercase tracking-[0.24em] text-white/45">
            {hoverCard.type}
          </p>
          <p className="mt-1 text-xs font-semibold text-white">{hoverCard.title}</p>
          <p className="mt-1 text-[11px] leading-4 text-white/65">
            {hoverCard.subtitle}
          </p>
        </div>
      )}

      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="office-ripple"
          style={
            {
              left: `${ripple.x}%`,
              top: `${ripple.y}%`,
              "--office-ripple-color": ripple.color,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
