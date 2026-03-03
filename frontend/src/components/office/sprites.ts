// ── Multi-Room Pixel Art Office ──
// 32×24 tile grid (512×384px). Compact layout with explicit wall tiles.
// Walls are NEVER walkable — collision map has zero overlap with visual walls.

export const TILE = 16;
export const CANVAS_COLS = 32;
export const CANVAS_ROWS = 24;
export const CANVAS_W = CANVAS_COLS * TILE; // 512
export const CANVAS_H = CANVAS_ROWS * TILE; // 384

const T = TILE;

// ═══════════════════════════════════════════════════════════
// ROOM GEOMETRY
// ═══════════════════════════════════════════════════════════

export type RoomId = "office" | "meeting" | "kitchen" | "bedroom" | "hallway";

interface RoomRect {
  col0: number; row0: number; col1: number; row1: number;
  floorA: string; floorB: string; label: string;
}

export const ROOMS: Record<RoomId, RoomRect> = {
  office:  { col0: 1,  row0: 1,  col1: 14, row1: 9,  floorA: "#8B7355", floorB: "#7D6B4D", label: "OFFICE" },
  meeting: { col0: 17, row0: 1,  col1: 30, row1: 9,  floorA: "#7A7265", floorB: "#726A5D", label: "MEETING" },
  kitchen: { col0: 1,  row0: 14, col1: 14, row1: 22, floorA: "#C4B898", floorB: "#B8AC8C", label: "KITCHEN" },
  bedroom: { col0: 17, row0: 14, col1: 30, row1: 22, floorA: "#7A6555", floorB: "#72604F", label: "BEDROOM" },
  hallway: { col0: 1,  row0: 11, col1: 30, row1: 12, floorA: "#8A8478", floorB: "#7E7870", label: "" },
};

// Doorway gaps (4-tile wide openings in inner walls)
// Upper wall (row 10): gaps at cols 6-9 (office) and 22-25 (meeting)
// Lower wall (row 13): gaps at cols 6-9 (kitchen) and 22-25 (bedroom)
const DOORWAY_GAPS = {
  upper: [{ c0: 6, c1: 9 }, { c0: 22, c1: 25 }],
  lower: [{ c0: 6, c1: 9 }, { c0: 22, c1: 25 }],
};

// ═══════════════════════════════════════════════════════════
// FURNITURE POSITIONS (pixel coords)
// ═══════════════════════════════════════════════════════════

// Office desks (4)
export const DESK_SLOTS = [
  { x: 2 * T, y: 2 * T },   // top-left
  { x: 8 * T, y: 2 * T },   // top-right
  { x: 2 * T, y: 6 * T },   // bottom-left
  { x: 8 * T, y: 6 * T },   // bottom-right
];

// Meeting seats (4 around table)
export const MEETING_SEATS = [
  { x: 21 * T, y: 3 * T },     // top-left of table
  { x: 25 * T, y: 3 * T },     // top-right of table
  { x: 21 * T, y: 7 * T },     // bottom-left
  { x: 25 * T, y: 7 * T },     // bottom-right
];

// Kitchen
export const STOVE_SLOTS = [
  { x: 5 * T, y: 15 * T },
  { x: 7 * T, y: 15 * T },
];
export const DINING_SEATS = [
  { x: 5 * T, y: 19 * T },
  { x: 8 * T, y: 19 * T },
];

// Bedroom
export const BED_SLOTS = [
  { x: 18 * T, y: 15 * T },
  { x: 18 * T, y: 19 * T },
];
export const SOFA_SLOTS = [
  { x: 25 * T, y: 19 * T },
  { x: 27 * T, y: 19 * T },
];

export const COFFEE_POS = { x: 12 * T, y: 5 * T };

// Static furniture draw positions
const MEETING_TABLE_POS = { x: 21 * T, y: 4 * T + 8 };
export const WHITEBOARD_POS = { x: 20 * T, y: 1 * T + 4 };
const FRIDGE_POS = { x: 1 * T, y: 14 * T };
const STOVE_DRAW_POS = { x: 4 * T, y: 14 * T };
const COUNTER_POS = { x: 8 * T, y: 14 * T };
const DINING_TABLE_POS = { x: 5 * T, y: 18 * T };
const TV_POS = { x: 26 * T, y: 14 * T + 2 };
const LAMP_POS = { x: 23 * T, y: 14 * T + 4 };
const NIGHTSTAND_POS = { x: 20 * T, y: 17 * T };

const BOOKSHELF_POS = { x: 13 * T, y: 1 * T + 4 };
const WINDOW_POS = { x: 5 * T, y: 1 * T + 4 };
const CLOCK_POS = { x: 10 * T, y: 1 * T + 6 };

// Sprite decoration positions
export const CAT_POS = { x: 12 * T, y: 8 * T };
const CAT2_POS = { x: 29 * T, y: 21 * T };
export const PLANT_SPRITE_POSITIONS = [
  { x: 1 * T, y: 8 * T },     // office bottom-left
  { x: 13 * T, y: 21 * T },   // kitchen corner
  { x: 29 * T, y: 21 * T - 4 }, // bedroom corner
];
const FLOWER_POSITIONS = [
  { x: 17 * T + 2, y: 1 * T + 4 },  // meeting left
  { x: 28 * T, y: 1 * T + 4 },       // meeting right
];

// Rugs
const OFFICE_RUG = { x: 5 * T, y: 4 * T, w: 6 * T, h: T };
const KITCHEN_RUG = { x: 4 * T, y: 17 * T, w: 7 * T, h: 4 * T };
const BEDROOM_RUG = { x: 23 * T, y: 17 * T, w: 6 * T, h: 4 * T };

// Hallway wander bounds (pixel coords within hallway rows 11-12)
export const HALLWAY_BOUNDS = {
  minX: 2 * T, maxX: 29 * T, minY: 11 * T + 4, maxY: 12 * T + 8,
};

// ═══════════════════════════════════════════════════════════
// COLLISION MAP + PATHFINDING
// ═══════════════════════════════════════════════════════════

// 0=walkable, 1=wall, 2=furniture
let _collisionMap: number[][] | null = null;

export function resetCollisionMap() { _collisionMap = null; }

export function getCollisionMap(): number[][] {
  if (_collisionMap) return _collisionMap;
  const map = Array.from({ length: CANVAS_ROWS }, () =>
    new Array(CANVAS_COLS).fill(1), // default: wall
  );

  // 1. Carve room interiors (walkable)
  const rooms = [ROOMS.office, ROOMS.meeting, ROOMS.kitchen, ROOMS.bedroom];
  for (const room of rooms) {
    for (let r = room.row0; r <= room.row1; r++) {
      for (let c = room.col0; c <= room.col1; c++) map[r][c] = 0;
    }
  }

  // 2. Carve hallway (rows 11-12, cols 1-30)
  for (let r = 11; r <= 12; r++) {
    for (let c = 1; c <= 30; c++) map[r][c] = 0;
  }

  // 3. Carve doorway gaps in row 10 and row 13
  for (const gap of DOORWAY_GAPS.upper) {
    for (let c = gap.c0; c <= gap.c1; c++) map[10][c] = 0;
  }
  for (const gap of DOORWAY_GAPS.lower) {
    for (let c = gap.c0; c <= gap.c1; c++) map[13][c] = 0;
  }

  // 4. Mark furniture tiles as non-walkable (type=2)
  const markRect = (px: number, py: number, tw: number, th: number) => {
    const c0 = Math.floor(px / T);
    const r0 = Math.floor(py / T);
    for (let dr = 0; dr < th; dr++) {
      for (let dc = 0; dc < tw; dc++) {
        const r = r0 + dr, c = c0 + dc;
        if (r >= 0 && r < CANVAS_ROWS && c >= 0 && c < CANVAS_COLS) map[r][c] = 2;
      }
    }
  };

  // Desks (2 tiles wide × 2 tall including monitor area)
  for (const d of DESK_SLOTS) markRect(d.x, d.y - T, 2, 2);
  // Meeting table (3×2)
  markRect(MEETING_TABLE_POS.x, MEETING_TABLE_POS.y, 3, 2);
  // Fridge (1×2)
  markRect(FRIDGE_POS.x, FRIDGE_POS.y, 1, 2);
  // Stove (2×1)
  markRect(STOVE_DRAW_POS.x, STOVE_DRAW_POS.y, 2, 1);
  // Counter (2×1)
  markRect(COUNTER_POS.x, COUNTER_POS.y, 2, 1);
  // Dining table (2×1)
  markRect(DINING_TABLE_POS.x, DINING_TABLE_POS.y, 2, 1);
  // Beds (2×1 each)
  for (const b of BED_SLOTS) markRect(b.x, b.y, 2, 1);
  // TV (1×1)
  markRect(TV_POS.x, TV_POS.y, 1, 1);
  // Nightstand (1×1)
  markRect(NIGHTSTAND_POS.x, NIGHTSTAND_POS.y, 1, 1);

  _collisionMap = map;
  return map;
}

// BFS pathfinding with 8-directional movement
export function findPath(
  sc: number, sr: number,
  ec: number, er: number,
): { c: number; r: number }[] {
  const map = getCollisionMap();
  if (sc === ec && sr === er) return [];
  // Clamp to bounds
  const clampC = (v: number) => Math.max(0, Math.min(v, CANVAS_COLS - 1));
  const clampR = (v: number) => Math.max(0, Math.min(v, CANVAS_ROWS - 1));
  sc = clampC(sc); sr = clampR(sr);
  ec = clampC(ec); er = clampR(er);

  // If start is in a wall, find nearest walkable tile
  if (map[sr][sc] === 1) {
    let best: { c: number; r: number } | null = null;
    let bestD = Infinity;
    for (let r = Math.max(0, sr - 3); r <= Math.min(CANVAS_ROWS - 1, sr + 3); r++) {
      for (let c = Math.max(0, sc - 3); c <= Math.min(CANVAS_COLS - 1, sc + 3); c++) {
        if (map[r][c] === 0) {
          const d = Math.abs(r - sr) + Math.abs(c - sc);
          if (d < bestD) { bestD = d; best = { c, r }; }
        }
      }
    }
    if (best) { sc = best.c; sr = best.r; }
    else return [];
  }

  const key = (c: number, r: number) => r * CANVAS_COLS + c;
  const visited = new Set<number>();
  const parent = new Map<number, number>();
  const queue: number[] = [];

  const sk = key(sc, sr);
  const ek = key(ec, er);
  queue.push(sk);
  visited.add(sk);

  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const cc = curr % CANVAS_COLS;
    const cr = Math.floor(curr / CANVAS_COLS);

    for (const [dc, dr] of dirs) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nc >= CANVAS_COLS || nr < 0 || nr >= CANVAS_ROWS) continue;

      const nk = key(nc, nr);
      if (visited.has(nk)) continue;
      if (map[nr][nc] === 1) continue; // wall blocked
      // furniture: only walkable if it's the destination
      if (map[nr][nc] === 2 && nk !== ek) continue;
      // Diagonal: check both adjacent cardinals are passable
      if (dc !== 0 && dr !== 0) {
        const adjA = map[cr][cc + dc];
        const adjB = map[cr + dr][cc];
        if (adjA >= 1 || adjB >= 1) continue;
      }

      visited.add(nk);
      parent.set(nk, curr);

      if (nk === ek) {
        const path: { c: number; r: number }[] = [];
        let k = ek;
        while (k !== sk) {
          path.push({ c: k % CANVAS_COLS, r: Math.floor(k / CANVAS_COLS) });
          k = parent.get(k)!;
        }
        path.reverse();
        return path;
      }
      queue.push(nk);
    }
  }

  return []; // no path
}

// Simplify path by removing intermediate collinear points
export function simplifyPath(path: { c: number; r: number }[]): { c: number; r: number }[] {
  if (path.length <= 2) return path;
  const result = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const prev = result[result.length - 1];
    const next = path[i + 1];
    const dc1 = path[i].c - prev.c;
    const dr1 = path[i].r - prev.r;
    const dc2 = next.c - path[i].c;
    const dr2 = next.r - path[i].r;
    if (dc1 !== dc2 || dr1 !== dr2) result.push(path[i]);
  }
  result.push(path[path.length - 1]);
  return result;
}

// ═══════════════════════════════════════════════════════════
// ASSET LOADER
// ═══════════════════════════════════════════════════════════

export interface OfficeAssets {
  cats: HTMLImageElement | null;
  plants: HTMLImageElement | null;
  flowers: HTMLImageElement | null;
  sofa: HTMLImageElement | null;
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadOfficeAssets(): Promise<OfficeAssets> {
  const [cats, plants, flowers, sofa] = await Promise.all([
    loadImg("/office/cats-spritesheet.webp"),
    loadImg("/office/plants-spritesheet.webp"),
    loadImg("/office/flowers-spritesheet.webp"),
    loadImg("/office/sofa-idle.webp"),
  ]);
  return { cats, plants, flowers, sofa };
}

// ═══════════════════════════════════════════════════════════
// COLOR HELPERS
// ═══════════════════════════════════════════════════════════

export function darken(hex: string, amt = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - amt;
  return `rgb(${(r * f) | 0},${(g * f) | 0},${(b * f) | 0})`;
}

export function withAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ═══════════════════════════════════════════════════════════
// DRAWING FUNCTIONS
// ═══════════════════════════════════════════════════════════

// ── Floors ──

export function drawFloors(ctx: CanvasRenderingContext2D) {
  // Room floors
  const rooms = [ROOMS.office, ROOMS.meeting, ROOMS.kitchen, ROOMS.bedroom];
  for (const r of rooms) {
    for (let row = r.row0; row <= r.row1; row++) {
      for (let col = r.col0; col <= r.col1; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? r.floorA : r.floorB;
        ctx.fillRect(col * T, row * T, T, T);
        // Subtle top-edge line for depth
        ctx.fillStyle = "rgba(0,0,0,0.04)";
        ctx.fillRect(col * T, row * T, T, 1);
      }
    }
  }

  // Hallway floor (rows 11-12)
  const h = ROOMS.hallway;
  for (let row = h.row0; row <= h.row1; row++) {
    for (let col = h.col0; col <= h.col1; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? h.floorA : h.floorB;
      ctx.fillRect(col * T, row * T, T, T);
    }
  }

  // Doorway gap floors (row 10 and 13 at gap positions)
  for (const gap of DOORWAY_GAPS.upper) {
    for (let c = gap.c0; c <= gap.c1; c++) {
      ctx.fillStyle = (10 + c) % 2 === 0 ? h.floorA : h.floorB;
      ctx.fillRect(c * T, 10 * T, T, T);
    }
  }
  for (const gap of DOORWAY_GAPS.lower) {
    for (let c = gap.c0; c <= gap.c1; c++) {
      ctx.fillStyle = (13 + c) % 2 === 0 ? h.floorA : h.floorB;
      ctx.fillRect(c * T, 13 * T, T, T);
    }
  }
}

// ── Walls ──

export function drawWalls(ctx: CanvasRenderingContext2D) {
  const wall = "#5A4E3E";
  const trim = "#7B6D55";

  // Outer walls
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, CANVAS_W, T);           // top (row 0)
  ctx.fillRect(0, 23 * T, CANVAS_W, T);       // bottom (row 23)
  ctx.fillRect(0, 0, T, CANVAS_H);            // left (col 0)
  ctx.fillRect(31 * T, 0, T, CANVAS_H);       // right (col 31)

  // Top baseboard trim
  ctx.fillStyle = trim;
  ctx.fillRect(T, T - 2, (CANVAS_COLS - 2) * T, 2);
  // Bottom baseboard trim
  ctx.fillRect(T, 23 * T, (CANVAS_COLS - 2) * T, 2);

  // Vertical divider walls (cols 15-16, excluding hallway rows 11-12)
  ctx.fillStyle = wall;
  // Top section: rows 0-10
  ctx.fillRect(15 * T, 0, 2 * T, 11 * T);
  // Bottom section: rows 13-23
  ctx.fillRect(15 * T, 13 * T, 2 * T, 11 * T);

  // Inner horizontal wall: row 10 (with doorway gaps)
  ctx.fillStyle = wall;
  // Office side: cols 1-5, then 10-14
  ctx.fillRect(1 * T, 10 * T, 5 * T, T);     // cols 1-5
  ctx.fillRect(10 * T, 10 * T, 5 * T, T);    // cols 10-14
  // Meeting side: cols 17-21, then 26-30
  ctx.fillRect(17 * T, 10 * T, 5 * T, T);    // cols 17-21
  ctx.fillRect(26 * T, 10 * T, 5 * T, T);    // cols 26-30
  // Trim above doorways
  ctx.fillStyle = trim;
  ctx.fillRect(1 * T, 11 * T - 2, 5 * T, 2);
  ctx.fillRect(10 * T, 11 * T - 2, 5 * T, 2);
  ctx.fillRect(17 * T, 11 * T - 2, 5 * T, 2);
  ctx.fillRect(26 * T, 11 * T - 2, 5 * T, 2);

  // Inner horizontal wall: row 13 (with doorway gaps)
  ctx.fillStyle = wall;
  ctx.fillRect(1 * T, 13 * T, 5 * T, T);     // cols 1-5
  ctx.fillRect(10 * T, 13 * T, 5 * T, T);    // cols 10-14
  ctx.fillRect(17 * T, 13 * T, 5 * T, T);    // cols 17-21
  ctx.fillRect(26 * T, 13 * T, 5 * T, T);    // cols 26-30
  // Trim below doorways
  ctx.fillStyle = trim;
  ctx.fillRect(1 * T, 13 * T, 5 * T, 2);
  ctx.fillRect(10 * T, 13 * T, 5 * T, 2);
  ctx.fillRect(17 * T, 13 * T, 5 * T, 2);
  ctx.fillRect(26 * T, 13 * T, 5 * T, 2);
}

// ── Room Labels ──

export function drawRoomLabels(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.font = "bold 6px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  // Labels above doorways (on the wall at row 10)
  ctx.fillText("OFFICE", 6 * T + 2, 10 * T + T - 4);
  ctx.fillText("MEETING", 22 * T, 10 * T + T - 4);
  // Labels below doorways (on the wall at row 13)
  ctx.fillText("KITCHEN", 6 * T, 13 * T + 10);
  ctx.fillText("BEDROOM", 22 * T, 13 * T + 10);
  ctx.restore();
}

// ── Bookshelf ──

export function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#6B5030";
  ctx.fillRect(x, y, 28, 28);
  ctx.fillStyle = "#5A4020";
  ctx.fillRect(x + 1, y + 1, 26, 26);
  ctx.fillStyle = "#7B6040";
  ctx.fillRect(x + 1, y + 9, 26, 2);
  ctx.fillRect(x + 1, y + 18, 26, 2);
  const colors = ["#c0392b", "#2980b9", "#27ae60", "#f39c12", "#8e44ad", "#e74c3c"];
  for (let i = 0; i < 6; i++) {
    const bx = x + 2 + i * 4;
    ctx.fillStyle = colors[i];
    ctx.fillRect(bx, y + 9 - (6 + (i % 3)), 3, 6 + (i % 3));
    ctx.fillRect(bx, y + 18 - (5 + ((i + 1) % 3)), 3, 5 + ((i + 1) % 3));
    ctx.fillRect(bx, y + 27 - (5 + ((i + 2) % 2)), 3, 5 + ((i + 2) % 2));
  }
}

// ── Desk + Monitor ──

export function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, monitorGlow?: string | null) {
  // Monitor stand
  ctx.fillStyle = "#555";
  ctx.fillRect(x + 12, y - 2, 4, 3);
  // Monitor
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(x + 5, y - 14, 18, 12);
  ctx.fillStyle = monitorGlow ? withAlpha(monitorGlow, 0.7) : "#111822";
  ctx.fillRect(x + 6, y - 13, 16, 10);
  if (monitorGlow) {
    ctx.fillStyle = withAlpha(monitorGlow, 0.12);
    ctx.fillRect(x + 2, y - 16, 24, 16);
  }
  // Desk surface
  ctx.fillStyle = "#8B7355";
  ctx.fillRect(x, y, 28, 5);
  ctx.fillStyle = "#6B5535";
  ctx.fillRect(x, y + 5, 28, 2);
  // Keyboard
  ctx.fillStyle = "#555";
  ctx.fillRect(x + 7, y + 1, 14, 3);
  // Mug
  ctx.fillStyle = "#ddd";
  ctx.fillRect(x + 23, y - 1, 4, 4);
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(x + 24, y, 2, 2);
}

// ── Chair ──

export function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#4A3A2A";
  ctx.fillRect(x + 4, y, 20, 6);
  ctx.fillStyle = "#3A2A1A";
  ctx.fillRect(x + 5, y + 6, 18, 4);
  ctx.fillStyle = "#333";
  ctx.fillRect(x + 8, y + 10, 3, 2);
  ctx.fillRect(x + 17, y + 10, 3, 2);
}

// ── Coffee Machine ──

export function drawCoffeeMachine(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#555";
  ctx.fillRect(x, y, 14, 18);
  ctx.fillStyle = "#666";
  ctx.fillRect(x + 1, y + 1, 12, 8);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(x + 2, y + 10, 3, 2);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(x + 6, y + 10, 3, 2);
  ctx.fillStyle = "#444";
  ctx.fillRect(x + 3, y + 13, 8, 4);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 5, y + 14, 4, 3);
}

// ── Whiteboard ──

export function drawWhiteboard(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#999";
  ctx.fillRect(x, y, 34, 22);
  ctx.fillStyle = "#f0f0e8";
  ctx.fillRect(x + 1, y + 1, 32, 20);
  const noteColors = ["#fbbf24", "#fb923c", "#34d399", "#60a5fa"];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = noteColors[i];
    ctx.fillRect(x + 3 + i * 7, y + 3, 5, 5);
    ctx.fillRect(x + 3 + i * 7, y + 10, 5, 4);
  }
  ctx.fillStyle = "#777";
  ctx.fillRect(x + 2, y + 22, 30, 2);
}

// ── Window ──

export function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#6B5B45";
  ctx.fillRect(x, y, 26, 20);
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(x + 1, y + 1, 11, 8);
  ctx.fillRect(x + 14, y + 1, 11, 8);
  ctx.fillRect(x + 1, y + 11, 11, 8);
  ctx.fillRect(x + 14, y + 11, 11, 8);
  ctx.fillStyle = "#6B5B45";
  ctx.fillRect(x + 12, y, 2, 20);
  ctx.fillRect(x, y + 9, 26, 2);
}

// ── Clock ──

export function drawClock(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 2, y, 8, 12);
  ctx.fillRect(x, y + 2, 12, 8);
  ctx.fillRect(x + 1, y + 1, 10, 10);
  ctx.fillStyle = "#f8f8f0";
  ctx.fillRect(x + 2, y + 2, 8, 8);
  ctx.fillStyle = "#222";
  ctx.fillRect(x + 6, y + 3, 1, 4);
  ctx.fillRect(x + 6, y + 6, 3, 1);
  ctx.fillStyle = "#c00";
  ctx.fillRect(x + 5, y + 5, 2, 2);
}

// ── Rug ──

export function drawRug(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y + h - 2, w, 2);
  ctx.fillRect(x, y, 2, h);
  ctx.fillRect(x + w - 2, y, 2, h);
}

// ── Meeting Table ──

export function drawMeetingTable(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#7B6040";
  ctx.fillRect(x, y, 40, 20);
  ctx.fillStyle = "#6B5030";
  ctx.fillRect(x, y + 20, 40, 3);
  ctx.fillStyle = "#5A4020";
  ctx.fillRect(x + 2, y + 23, 4, 3);
  ctx.fillRect(x + 34, y + 23, 4, 3);
  // Chairs
  ctx.fillStyle = "#4A3A2A";
  ctx.fillRect(x + 6, y - 6, 10, 5);
  ctx.fillRect(x + 24, y - 6, 10, 5);
  ctx.fillRect(x + 6, y + 26, 10, 5);
  ctx.fillRect(x + 24, y + 26, 10, 5);
}

// ── Bed ──

export function drawBed(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#7B6040";
  ctx.fillRect(x, y, 32, 18);
  ctx.fillStyle = "#E8DDD0";
  ctx.fillRect(x + 1, y + 1, 30, 16);
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(x + 2, y + 2, 10, 6);
  ctx.fillStyle = "#4a6fa5";
  ctx.fillRect(x + 1, y + 9, 30, 8);
  ctx.fillStyle = "#3d5e8c";
  ctx.fillRect(x + 1, y + 9, 30, 2);
  ctx.fillStyle = "#5A4020";
  ctx.fillRect(x + 28, y, 4, 18);
}

// ── Sofa (procedural fallback) ──

export function drawSofaFallback(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#8A7060";
  ctx.fillRect(x, y, 36, 6);
  ctx.fillStyle = "#9A8070";
  ctx.fillRect(x + 2, y + 6, 32, 10);
  ctx.fillStyle = "#8A7060";
  ctx.fillRect(x, y + 4, 3, 12);
  ctx.fillRect(x + 33, y + 4, 3, 12);
  ctx.fillStyle = "#7A6050";
  ctx.fillRect(x + 12, y + 6, 1, 10);
  ctx.fillRect(x + 23, y + 6, 1, 10);
}

// ── TV ──

export function drawTV(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  ctx.fillStyle = "#333";
  ctx.fillRect(x + 8, y + 14, 4, 4);
  ctx.fillRect(x + 4, y + 17, 12, 2);
  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, 20, 14);
  // Animated color bars (TV is the only animated element)
  const bars = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#8b5cf6"];
  const off = Math.floor(frame / 40) % bars.length;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = withAlpha(bars[(i + off) % bars.length], 0.6);
    ctx.fillRect(x + 1 + i * 4 + (i > 1 ? 1 : 0), y + 1, 4, 12);
  }
  ctx.fillStyle = "rgba(100,150,255,0.06)";
  ctx.fillRect(x - 4, y - 2, 28, 22);
}

// ── Fridge ──

export function drawFridge(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#ccc";
  ctx.fillRect(x, y, 14, 24);
  ctx.fillStyle = "#bbb";
  ctx.fillRect(x, y + 10, 14, 1);
  ctx.fillStyle = "#999";
  ctx.fillRect(x + 11, y + 3, 2, 6);
  ctx.fillRect(x + 11, y + 13, 2, 6);
}

// ── Stove ──

export function drawStove(ctx: CanvasRenderingContext2D, x: number, y: number, active = false) {
  ctx.fillStyle = "#555";
  ctx.fillRect(x, y, 24, 14);
  ctx.fillStyle = "#444";
  ctx.fillRect(x, y, 24, 2);
  const burner = active ? "#ff6600" : "#666";
  ctx.fillStyle = burner;
  ctx.fillRect(x + 3, y + 3, 6, 4);
  ctx.fillRect(x + 14, y + 3, 6, 4);
  ctx.fillRect(x + 3, y + 9, 6, 4);
  ctx.fillRect(x + 14, y + 9, 6, 4);
  if (active) {
    ctx.fillStyle = "#ff9944";
    ctx.fillRect(x + 4, y + 4, 4, 2);
    ctx.fillRect(x + 15, y + 4, 4, 2);
    ctx.fillStyle = "rgba(255,102,0,0.1)";
    ctx.fillRect(x - 4, y - 4, 32, 22);
  }
}

// ── Kitchen Counter ──

export function drawCounter(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#8B7355";
  ctx.fillRect(x, y, 28, 10);
  ctx.fillStyle = "#6B5535";
  ctx.fillRect(x, y + 10, 28, 2);
  ctx.fillStyle = "#c8a870";
  ctx.fillRect(x + 3, y + 2, 8, 6);
  ctx.fillStyle = "#999";
  ctx.fillRect(x + 13, y + 4, 6, 1);
  ctx.fillStyle = "#ddd";
  ctx.fillRect(x + 21, y + 2, 5, 5);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(x + 22, y + 3, 3, 3);
}

// ── Dining Table ──

export function drawDiningTable(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#8B7355";
  ctx.fillRect(x, y, 24, 16);
  ctx.fillStyle = "#6B5535";
  ctx.fillRect(x, y + 16, 24, 2);
  ctx.fillStyle = "#5A4525";
  ctx.fillRect(x + 1, y + 18, 3, 3);
  ctx.fillRect(x + 20, y + 18, 3, 3);
  ctx.fillStyle = "#eee";
  ctx.fillRect(x + 4, y + 3, 5, 5);
  ctx.fillRect(x + 15, y + 3, 5, 5);
  ctx.fillStyle = "#4A3A2A";
  ctx.fillRect(x + 2, y - 5, 8, 4);
  ctx.fillRect(x + 14, y - 5, 8, 4);
}

// ── Lamp ──

export function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#999";
  ctx.fillRect(x + 3, y + 6, 2, 14);
  ctx.fillStyle = "#777";
  ctx.fillRect(x + 1, y + 19, 6, 2);
  ctx.fillStyle = "#D4A850";
  ctx.fillRect(x, y, 8, 6);
  ctx.fillStyle = "#C89840";
  ctx.fillRect(x + 1, y + 1, 6, 4);
  ctx.fillStyle = "rgba(255,200,100,0.08)";
  ctx.fillRect(x - 8, y - 4, 24, 28);
}

// ── Nightstand ──

export function drawNightstand(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#6B5535";
  ctx.fillRect(x, y, 12, 12);
  ctx.fillStyle = "#5A4525";
  ctx.fillRect(x, y + 12, 12, 2);
  ctx.fillStyle = "#999";
  ctx.fillRect(x + 4, y + 5, 4, 2);
  ctx.fillStyle = "#D4A850";
  ctx.fillRect(x + 3, y - 4, 6, 4);
}

// ═══════════════════════════════════════════════════════════
// CHARACTER DRAWING
// ═══════════════════════════════════════════════════════════

export function drawCharacter(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  color: string, walkFrame: number, isSeated: boolean,
) {
  const dk = darken(color, 0.4);
  const skin = "#FFDBB4";

  if (!isSeated) {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(x + 2, y + 20, 12, 3);
  }

  // Hair
  ctx.fillStyle = dk;
  ctx.fillRect(x + 4, y, 8, 2);
  ctx.fillRect(x + 3, y + 1, 10, 2);
  ctx.fillRect(x + 3, y + 3, 2, 3);
  ctx.fillRect(x + 11, y + 3, 2, 3);
  // Head
  ctx.fillStyle = skin;
  ctx.fillRect(x + 4, y + 3, 8, 6);
  // Eyes
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(x + 5, y + 5, 2, 2);
  ctx.fillRect(x + 9, y + 5, 2, 2);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 5, y + 5, 1, 1);
  ctx.fillRect(x + 9, y + 5, 1, 1);
  // Mouth
  ctx.fillStyle = "#c9967a";
  ctx.fillRect(x + 6, y + 7, 4, 1);

  if (isSeated) {
    ctx.fillStyle = color;
    ctx.fillRect(x + 3, y + 9, 10, 6);
    ctx.fillRect(x + 1, y + 9, 2, 5);
    ctx.fillRect(x + 13, y + 9, 2, 5);
    ctx.fillStyle = skin;
    ctx.fillRect(x + 1, y + 14, 2, 1);
    ctx.fillRect(x + 13, y + 14, 2, 1);
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(x + 3, y + 9, 10, 7);
    ctx.fillRect(x + 1, y + 9, 2, 6);
    ctx.fillRect(x + 13, y + 9, 2, 6);
    ctx.fillStyle = skin;
    ctx.fillRect(x + 1, y + 15, 2, 1);
    ctx.fillRect(x + 13, y + 15, 2, 1);
    ctx.fillStyle = dk;
    if (walkFrame === 0) {
      ctx.fillRect(x + 4, y + 16, 3, 4);
      ctx.fillRect(x + 9, y + 16, 3, 4);
    } else {
      ctx.fillRect(x + 3, y + 16, 3, 4);
      ctx.fillRect(x + 10, y + 16, 3, 4);
    }
    ctx.fillStyle = "#444";
    if (walkFrame === 0) {
      ctx.fillRect(x + 3, y + 20, 4, 2);
      ctx.fillRect(x + 9, y + 20, 4, 2);
    } else {
      ctx.fillRect(x + 2, y + 20, 4, 2);
      ctx.fillRect(x + 10, y + 20, 4, 2);
    }
  }
}

export function drawSleepingCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  const dk = darken(color, 0.4);
  ctx.fillStyle = dk;
  ctx.fillRect(x, y + 1, 5, 4);
  ctx.fillStyle = "#FFDBB4";
  ctx.fillRect(x + 1, y + 2, 4, 3);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(x + 2, y + 3, 2, 1);
  ctx.fillStyle = color;
  ctx.fillRect(x + 5, y + 1, 8, 5);
  ctx.fillRect(x + 5, y, 4, 1);
  ctx.fillStyle = "#4a6fa5";
  ctx.fillRect(x + 8, y, 14, 7);
  ctx.fillStyle = "#3d5e8c";
  ctx.fillRect(x + 8, y, 1, 7);
}

export function drawCookingCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, frame: number) {
  drawCharacter(ctx, x, y, color, 0, false);
  ctx.fillStyle = "#999";
  ctx.fillRect(x + 14, y + 10, 6, 1);
  ctx.fillRect(x + 19, y + 8, 2, 4);
  if (Math.floor(frame / 20) % 2 === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(x + 16, y - 4, 2, 3);
    ctx.fillRect(x + 18, y - 6, 2, 3);
  }
}

// ── Effects ──

export function drawZzz(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  ctx.save();
  ctx.font = "bold 6px monospace";
  const b = Math.sin(frame * 0.06) * 2;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("z", x + 4, y - 2 + b);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText("z", x + 8, y - 6 + b * 0.7);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillText("Z", x + 12, y - 10 + b * 0.5);
  ctx.restore();
}

export function drawThoughtBubble(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const b = Math.sin(frame * 0.08) * 2;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(x + 10, y - 4, 2, 2);
  ctx.fillRect(x + 12, y - 7 + b * 0.3, 3, 3);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(x + 8, y - 14 + b * 0.5, 12, 6);
  ctx.fillRect(x + 9, y - 15 + b * 0.5, 10, 8);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(x + 10, y - 12 + b * 0.5, 2, 2);
  ctx.fillRect(x + 13, y - 12 + b * 0.5, 2, 2);
  ctx.fillRect(x + 16, y - 12 + b * 0.5, 2, 2);
}

export function drawErrorIndicator(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  if (Math.sin(frame * 0.15) > 0) {
    ctx.fillStyle = "rgba(239,68,68,0.35)";
    ctx.fillRect(x, y, 16, 22);
  }
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(x + 7, y - 8, 2, 4);
  ctx.fillRect(x + 7, y - 3, 2, 2);
}

export function drawNameTag(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, emoji: string) {
  ctx.save();
  ctx.font = "bold 5px monospace";
  const textW = ctx.measureText(name).width;
  const tagW = textW + 10;
  const tagX = x + 8 - tagW / 2;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(tagX, y, tagW, 7);
  ctx.fillStyle = "#fff";
  ctx.fillText(emoji, tagX + 1, y + 6);
  ctx.fillText(name, tagX + 7, y + 6);
  ctx.restore();
}

export function drawStatusDot(ctx: CanvasRenderingContext2D, x: number, y: number, status: string, frame: number) {
  const colors: Record<string, string> = { idle: "#22c55e", thinking: "#eab308", working: "#3b82f6", error: "#ef4444" };
  const c = colors[status] ?? "#22c55e";
  ctx.fillStyle = c;
  ctx.fillRect(x, y, 3, 3);
  if (status === "thinking" && Math.sin(frame * 0.1) > 0) {
    ctx.fillStyle = withAlpha(c, 0.3);
    ctx.fillRect(x - 1, y - 1, 5, 5);
  }
}

export function drawNeedsBar(ctx: CanvasRenderingContext2D, x: number, y: number, energy: number, hunger: number) {
  const barW = 16;
  const barH = 2;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = energy > 30 ? "#22c55e" : "#ef4444";
  ctx.fillRect(x, y, Math.max(1, (energy / 100) * barW), barH);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x, y + 3, barW, barH);
  ctx.fillStyle = hunger > 30 ? "#eab308" : "#ef4444";
  ctx.fillRect(x, y + 3, Math.max(1, (hunger / 100) * barW), barH);
}

// ═══════════════════════════════════════════════════════════
// STATIC SCENE DRAWING
// ═══════════════════════════════════════════════════════════

export function drawAllStaticDecor(ctx: CanvasRenderingContext2D, frame: number) {
  // Office wall decorations
  drawBookshelf(ctx, BOOKSHELF_POS.x, BOOKSHELF_POS.y);
  drawWindow(ctx, WINDOW_POS.x, WINDOW_POS.y);
  drawClock(ctx, CLOCK_POS.x, CLOCK_POS.y);
  drawCoffeeMachine(ctx, COFFEE_POS.x, COFFEE_POS.y);

  // Meeting room
  drawWhiteboard(ctx, WHITEBOARD_POS.x, WHITEBOARD_POS.y);

  // Rugs
  drawRug(ctx, OFFICE_RUG.x, OFFICE_RUG.y, OFFICE_RUG.w, OFFICE_RUG.h, "#5A4535");
  drawRug(ctx, KITCHEN_RUG.x, KITCHEN_RUG.y, KITCHEN_RUG.w, KITCHEN_RUG.h, "#9A8A6A");
  drawRug(ctx, BEDROOM_RUG.x, BEDROOM_RUG.y, BEDROOM_RUG.w, BEDROOM_RUG.h, "#6A4545");

  // Kitchen fixed furniture
  drawFridge(ctx, FRIDGE_POS.x, FRIDGE_POS.y);
  drawCounter(ctx, COUNTER_POS.x, COUNTER_POS.y);

  // Bedroom
  drawTV(ctx, TV_POS.x, TV_POS.y, frame);
  drawLamp(ctx, LAMP_POS.x, LAMP_POS.y);
  drawNightstand(ctx, NIGHTSTAND_POS.x, NIGHTSTAND_POS.y);
}

// Draw loaded sprite assets — STATIC frame 0 only (no cycling)
export function drawSpriteAssets(ctx: CanvasRenderingContext2D, assets: OfficeAssets) {
  // Plants (160×160 per frame, draw at 28×28) — always frame 0
  if (assets.plants) {
    for (const p of PLANT_SPRITE_POSITIONS) {
      ctx.drawImage(assets.plants, 0, 0, 160, 160, p.x, p.y, 28, 28);
    }
  }

  // Flowers (65×65 per frame, draw at 18×18) — always frame 0
  if (assets.flowers) {
    for (const f of FLOWER_POSITIONS) {
      ctx.drawImage(assets.flowers, 0, 0, 65, 65, f.x, f.y, 18, 18);
    }
  }

  // Cats (160×160 per frame, draw at 28×28) — always frame 0
  if (assets.cats) {
    ctx.drawImage(assets.cats, 0, 0, 160, 160, CAT_POS.x, CAT_POS.y, 28, 28);
    ctx.drawImage(assets.cats, 0, 160, 160, 160, CAT2_POS.x, CAT2_POS.y, 24, 24);
  }
}

// ── Y-sorted furniture drawables ──

export interface Drawable {
  y: number;
  draw: () => void;
}

export function collectFurnitureDrawables(
  ctx: CanvasRenderingContext2D, _frame: number,
  activeCookers: Set<string>, assets: OfficeAssets,
): Drawable[] {
  const drawables: Drawable[] = [];

  drawables.push({ y: MEETING_TABLE_POS.y, draw: () => drawMeetingTable(ctx, MEETING_TABLE_POS.x, MEETING_TABLE_POS.y) });
  drawables.push({ y: DINING_TABLE_POS.y, draw: () => drawDiningTable(ctx, DINING_TABLE_POS.x, DINING_TABLE_POS.y) });
  drawables.push({ y: STOVE_DRAW_POS.y, draw: () => drawStove(ctx, STOVE_DRAW_POS.x, STOVE_DRAW_POS.y, activeCookers.size > 0) });

  for (const bed of BED_SLOTS) {
    drawables.push({ y: bed.y, draw: () => drawBed(ctx, bed.x, bed.y) });
  }

  // Sofa: use loaded asset or fallback
  const sofaY = 18 * T;
  if (assets.sofa) {
    drawables.push({ y: sofaY, draw: () => ctx.drawImage(assets.sofa!, 25 * T, sofaY, 44, 44) });
  } else {
    drawables.push({ y: sofaY, draw: () => drawSofaFallback(ctx, 25 * T, sofaY) });
  }

  return drawables;
}
