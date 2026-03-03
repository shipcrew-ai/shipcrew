import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? "shipcrew-dev-secret-change-in-production";
const EXPIRY = "7d";

interface TokenPayload {
  userId: string;
  email: string;
}

export function signToken(userId: string, email: string): string {
  return jwt.sign({ userId, email } satisfies TokenPayload, SECRET, {
    expiresIn: EXPIRY,
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}
