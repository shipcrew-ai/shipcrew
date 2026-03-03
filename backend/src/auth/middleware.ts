import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

const SKIP_PATHS = ["/health", "/api/auth/register", "/api/auth/login"];
const SKIP_PREFIXES = ["/hooks/"];

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (SKIP_PATHS.includes(req.path)) return next();
  if (SKIP_PREFIXES.some((p) => req.path.startsWith(p))) return next();

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const token = header.slice(7);
    const decoded = verifyToken(token);
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
