import crypto from "node:crypto";

import { Resend } from "resend";
import { v4 as uuidv4 } from "uuid";

import { db } from "../db/connection";

const MAX_VERIFY_ATTEMPTS = 5;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS =
  process.env.EMAIL_FROM || "Simple Calendar <onboarding@resend.dev>";

function generateVerificationCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/** Replaces any existing code for the user and returns a fresh 6-digit code. */
export function createVerificationCode(userId: string): string {
  const code = generateVerificationCode();
  db.prepare("DELETE FROM email_verifications WHERE user_id = ?").run(userId);
  // Store an explicit UTC ISO string (…Z) so `new Date()` parses it as UTC,
  // not as local time.
  db.prepare(
    `INSERT INTO email_verifications (id, user_id, code, expires_at)
     VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+10 minutes'))`,
  ).run(uuidv4(), userId, code);
  return code;
}

export function verifyCode(
  userId: string,
  code: string,
): { valid: boolean; error?: string } {
  const current = db
    .prepare(
      "SELECT id, code, expires_at, attempts FROM email_verifications WHERE user_id = ?",
    )
    .get(userId) as
    | { id: string; code: string; expires_at: string; attempts: number }
    | undefined;

  if (!current) {
    return { valid: false, error: "인증 코드가 올바르지 않습니다." };
  }

  if (new Date(current.expires_at).getTime() <= Date.now()) {
    db.prepare("DELETE FROM email_verifications WHERE user_id = ?").run(userId);
    return {
      valid: false,
      error: "인증 코드가 만료되었습니다. 재발송해주세요.",
    };
  }

  if (current.code === code) {
    db.prepare("DELETE FROM email_verifications WHERE user_id = ?").run(userId);
    db.prepare(
      "UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?",
    ).run(userId);
    return { valid: true };
  }

  const nextAttempts = (current.attempts ?? 0) + 1;
  if (nextAttempts >= MAX_VERIFY_ATTEMPTS) {
    db.prepare("DELETE FROM email_verifications WHERE user_id = ?").run(userId);
    return {
      valid: false,
      error: "인증 시도 횟수를 초과했습니다. 재발송해주세요.",
    };
  }

  db.prepare("UPDATE email_verifications SET attempts = ? WHERE id = ?").run(
    nextAttempts,
    current.id,
  );
  return { valid: false, error: "인증 코드가 올바르지 않습니다." };
}

function buildCodeEmailHtml(code: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 26px; color: #2563eb; margin: 0;">Simple Calendar</h1>
        <p style="color: #888; margin-top: 8px;">이메일 인증</p>
      </div>
      <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
        <p style="font-size: 16px; color: #333; margin: 0 0 24px;">
          이메일 인증을 완료하려면<br/>아래 코드를 입력해주세요.
        </p>
        <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #2563eb; background: #fff; border-radius: 12px; padding: 16px; display: inline-block; border: 2px solid #dbeafe;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #999; margin-top: 24px;">
          이 코드는 <strong>10분</strong> 후에 만료됩니다.
        </p>
      </div>
    </div>
  `;
}

export async function sendVerificationEmail(
  email: string,
  code: string,
): Promise<void> {
  if (!resend) {
    console.log(`📧 [DEV] 인증 코드 → ${email}: ${code}`);
    return;
  }

  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "Simple Calendar 이메일 인증 코드",
    html: buildCodeEmailHtml(code),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  console.log(`[email] Verification email sent to ${email}: ${result.data?.id}`);
}
