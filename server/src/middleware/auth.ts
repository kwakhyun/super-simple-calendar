import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

import { db } from "../db/connection";
import { ERROR_CODES, sendError } from "../utils/http";

const JWT_EXPIRES_IN = "30d";

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (!secret || secret.length < 16) {
    if (isProd) {
      throw new Error("JWT_SECRET must be set (>= 16 chars) in production.");
    }
    console.warn(
      "[auth] JWT_SECRET missing/short — using an insecure dev fallback.",
    );
    return "dev-insecure-secret-do-not-use-in-production";
  }

  return secret;
}

const JWT_SECRET = resolveJwtSecret();

export type AuthPayload = {
  userId: string;
  email: string;
};

export type AuthClaims = AuthPayload & {
  jti?: string;
  exp?: number;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
      tokenClaims?: AuthClaims;
    }
  }
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    jwtid: uuidv4(),
  });
}

export function verifyToken(token: string): AuthClaims {
  return jwt.verify(token, JWT_SECRET) as AuthClaims;
}

export function revokeToken(
  jti: string,
  userId: string | null,
  exp: number,
): void {
  if (!jti) return;
  db.prepare(
    "INSERT OR IGNORE INTO revoked_tokens (jti, user_id, exp) VALUES (?, ?, ?)",
  ).run(jti, userId, exp);
}

export function isRevoked(jti: string): boolean {
  const row = db
    .prepare("SELECT jti FROM revoked_tokens WHERE jti = ?")
    .get(jti);
  return Boolean(row);
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    sendError(res, 401, ERROR_CODES.UNAUTHORIZED, "인증이 필요합니다.");
    return;
  }

  try {
    const claims = verifyToken(header.slice(7));

    if (claims.jti && isRevoked(claims.jti)) {
      sendError(res, 401, ERROR_CODES.UNAUTHORIZED, "유효하지 않은 토큰입니다.");
      return;
    }

    const user = db
      .prepare("SELECT id FROM users WHERE id = ?")
      .get(claims.userId);

    if (!user) {
      sendError(res, 401, ERROR_CODES.UNAUTHORIZED, "유효하지 않은 토큰입니다.");
      return;
    }

    req.user = { userId: claims.userId, email: claims.email };
    req.tokenClaims = claims;
    next();
  } catch {
    sendError(res, 401, ERROR_CODES.UNAUTHORIZED, "유효하지 않은 토큰입니다.");
  }
}
