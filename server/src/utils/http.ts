import type { Response } from "express";

export const ERROR_CODES = {
  VALIDATION: "VALIDATION",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  extra?: Record<string, unknown>,
): void {
  res.status(status).json({ error: message, code, ...extra });
}
