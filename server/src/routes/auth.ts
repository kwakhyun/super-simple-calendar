import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

import { db } from "../db/connection";
import {
  authMiddleware,
  generateToken,
  revokeToken,
} from "../middleware/auth";
import { createVerificationCode, sendVerificationEmail, verifyCode } from "../utils/email";
import { ERROR_CODES, sendError } from "../utils/http";
// Social login is intentionally disabled for the initial release.
// import {
//   verifyAppleToken,
//   verifyGoogleToken,
//   verifyKakaoCode,
//   type OAuthProfile,
// } from "../utils/oauth";
import {
  loginSchema,
  registerSchema,
  // socialAuthSchema,
  verifyEmailSchema,
} from "../validation/schemas";

const router = Router();

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  auth_provider: string;
  email_verified: number;
};

function publicUser(row: Pick<UserRow, "id" | "email" | "auth_provider" | "email_verified">) {
  return {
    id: row.id,
    email: row.email,
    authProvider: row.auth_provider,
    emailVerified: row.email_verified === 1,
  };
}

// POST /auth/register --------------------------------------------------------
router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, ERROR_CODES.VALIDATION, parsed.error.issues[0].message);
    return;
  }
  const { email, password } = parsed.data;

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);
  if (existing) {
    sendError(res, 409, ERROR_CODES.CONFLICT, "이미 사용 중인 이메일입니다.");
    return;
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 12);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, auth_provider, email_verified)
     VALUES (?, ?, ?, 'email', 0)`,
  ).run(id, email, passwordHash);

  const code = createVerificationCode(id);
  try {
    await sendVerificationEmail(email, code);
  } catch (error) {
    console.error("[email] Failed to send verification email:", error);
    sendError(
      res,
      502,
      ERROR_CODES.INTERNAL,
      "인증 메일을 발송하지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
    return;
  }

  const token = generateToken({ userId: id, email });
  res.status(201).json({
    token,
    user: publicUser({
      id,
      email,
      auth_provider: "email",
      email_verified: 0,
    }),
  });
});

// POST /auth/login -----------------------------------------------------------
router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, ERROR_CODES.VALIDATION, parsed.error.issues[0].message);
    return;
  }
  const { email, password } = parsed.data;

  const user = db
    .prepare(
      "SELECT id, email, password_hash, auth_provider, email_verified FROM users WHERE email = ?",
    )
    .get(email) as UserRow | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    sendError(
      res,
      401,
      ERROR_CODES.UNAUTHORIZED,
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
    return;
  }

  const token = generateToken({ userId: user.id, email: user.email });

  if (user.email_verified !== 1) {
    const code = createVerificationCode(user.id);
    try {
      await sendVerificationEmail(user.email, code);
    } catch (error) {
      console.error("[email] Failed to send verification email:", error);
      sendError(
        res,
        502,
        ERROR_CODES.INTERNAL,
        "인증 메일을 발송하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
      return;
    }
    sendError(res, 403, ERROR_CODES.EMAIL_NOT_VERIFIED, "이메일 인증이 필요합니다.", {
      token,
      user: publicUser(user),
    });
    return;
  }

  res.json({ token, user: publicUser(user) });
});

// POST /auth/verify-email ----------------------------------------------------
router.post("/verify-email", authMiddleware, (req: Request, res: Response) => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, ERROR_CODES.VALIDATION, parsed.error.issues[0].message);
    return;
  }

  const result = verifyCode(req.user!.userId, parsed.data.code);
  if (!result.valid) {
    sendError(res, 400, ERROR_CODES.VALIDATION, result.error ?? "인증에 실패했습니다.");
    return;
  }

  res.json({ success: true });
});

// POST /auth/resend-verification --------------------------------------------
router.post(
  "/resend-verification",
  authMiddleware,
  async (req: Request, res: Response) => {
    const user = db
      .prepare("SELECT id, email, email_verified FROM users WHERE id = ?")
      .get(req.user!.userId) as
      | Pick<UserRow, "id" | "email" | "email_verified">
      | undefined;

    if (!user) {
      sendError(res, 404, ERROR_CODES.NOT_FOUND, "사용자를 찾을 수 없습니다.");
      return;
    }
    if (user.email_verified === 1) {
      sendError(res, 400, ERROR_CODES.VALIDATION, "이미 인증된 이메일입니다.");
      return;
    }

    const code = createVerificationCode(user.id);
    try {
      await sendVerificationEmail(user.email, code);
    } catch (error) {
      console.error("[email] Failed to send verification email:", error);
      sendError(
        res,
        502,
        ERROR_CODES.INTERNAL,
        "인증 메일을 발송하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
      return;
    }
    res.json({ success: true });
  },
);

// Social login is intentionally disabled for the initial release.
// POST /auth/social ----------------------------------------------------------
// router.post("/social", async (req: Request, res: Response) => {
//   const parsed = socialAuthSchema.safeParse(req.body);
//   if (!parsed.success) {
//     sendError(res, 400, ERROR_CODES.VALIDATION, parsed.error.issues[0].message);
//     return;
//   }
//   const { provider, token, redirectUri, email: bodyEmail } = parsed.data;
//
//   let profile: OAuthProfile;
//   try {
//     if (provider === "google") {
//       profile = await verifyGoogleToken(token);
//     } else if (provider === "apple") {
//       profile = await verifyAppleToken(token);
//     } else {
//       if (!redirectUri) {
//         sendError(
//           res,
//           400,
//           ERROR_CODES.VALIDATION,
//           "카카오 로그인에는 redirectUri가 필요합니다.",
//         );
//         return;
//       }
//       profile = await verifyKakaoCode(token, redirectUri);
//     }
//   } catch (e) {
//     const message = e instanceof Error ? e.message : "소셜 로그인 인증에 실패했습니다.";
//     sendError(res, 401, ERROR_CODES.UNAUTHORIZED, message);
//     return;
//   }
//
//   const result = upsertOAuthUser(provider, profile, bodyEmail);
//   res.status(result.created ? 201 : 200).json({
//     token: result.token,
//     user: result.user,
//   });
// });
//
// function upsertOAuthUser(
//   provider: "google" | "kakao" | "apple",
//   profile: OAuthProfile,
//   bodyEmail?: string,
// ) {
//   const email = bodyEmail || profile.email;
//
//   // 1. OAuth identity already linked -> log that user in.
//   const link = db
//     .prepare(
//       "SELECT user_id FROM user_oauth WHERE provider = ? AND provider_id = ?",
//     )
//     .get(provider, profile.id) as { user_id: string } | undefined;
//
//   if (link) {
//     const user = db
//       .prepare(
//         "SELECT id, email, auth_provider, email_verified FROM users WHERE id = ?",
//       )
//       .get(link.user_id) as UserRow;
//     db.prepare(
//       "UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?",
//     ).run(user.id);
//     return {
//       created: false,
//       token: generateToken({ userId: user.id, email: user.email }),
//       user: { ...publicUser(user), emailVerified: true },
//     };
//   }
//
//   // 2. Same email exists -> link the OAuth identity to it.
//   if (email) {
//     const existing = db
//       .prepare(
//         "SELECT id, email, auth_provider, email_verified FROM users WHERE email = ?",
//       )
//       .get(email) as UserRow | undefined;
//     if (existing) {
//       db.prepare(
//         "INSERT INTO user_oauth (user_id, provider, provider_id) VALUES (?, ?, ?)",
//       ).run(existing.id, provider, profile.id);
//       db.prepare(
//         "UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?",
//       ).run(existing.id);
//       return {
//         created: false,
//         token: generateToken({ userId: existing.id, email: existing.email }),
//         user: { ...publicUser(existing), emailVerified: true },
//       };
//     }
//   }
//
//   // 3. New user (OAuth accounts are considered email-verified).
//   const id = uuidv4();
//   const finalEmail = email || `${provider}_${profile.id}@calendar.local`;
//   const placeholderHash = bcrypt.hashSync(uuidv4(), 4);
//   db.prepare(
//     `INSERT INTO users (id, email, password_hash, auth_provider, email_verified)
//      VALUES (?, ?, ?, ?, 1)`,
//   ).run(id, finalEmail, placeholderHash, provider);
//   db.prepare(
//     "INSERT INTO user_oauth (user_id, provider, provider_id) VALUES (?, ?, ?)",
//   ).run(id, provider, profile.id);
//
//   return {
//     created: true,
//     token: generateToken({ userId: id, email: finalEmail }),
//     user: publicUser({
//       id,
//       email: finalEmail,
//       auth_provider: provider,
//       email_verified: 1,
//     }),
//   };
// }
//
// Kakao server-side flow: app opens /auth/kakao/start in a web browser, we
// redirect to Kakao, Kakao redirects back to /auth/kakao/callback, and we
// deep-link the JWT back into the app via the configured app scheme.
// router.get("/kakao/start", (_req: Request, res: Response) => {
//   const kakaoKey = process.env.KAKAO_REST_API_KEY;
//   if (!kakaoKey) {
//     res.status(500).send("KAKAO_REST_API_KEY is not configured.");
//     return;
//   }
//   const serverUrl = process.env.SERVER_URL || "http://localhost:4000";
//   const redirectUri = `${serverUrl}/auth/kakao/callback`;
//   const authUrl =
//     "https://kauth.kakao.com/oauth/authorize?" +
//     new URLSearchParams({
//       client_id: kakaoKey,
//       redirect_uri: redirectUri,
//       response_type: "code",
//     }).toString();
//   res.redirect(authUrl);
// });
//
// router.get("/kakao/callback", async (req: Request, res: Response) => {
//   const code = typeof req.query.code === "string" ? req.query.code : "";
//   const scheme = process.env.APP_SCHEME || "supersimplecalendar";
//   const serverUrl = process.env.SERVER_URL || "http://localhost:4000";
//   const redirectUri = `${serverUrl}/auth/kakao/callback`;
//
//   try {
//     if (!code) {
//       throw new Error("카카오 인증 코드가 없습니다.");
//     }
//     const profile = await verifyKakaoCode(code, redirectUri);
//     const result = upsertOAuthUser("kakao", profile);
//     res.redirect(`${scheme}://auth?token=${encodeURIComponent(result.token)}`);
//   } catch (e) {
//     const message =
//       e instanceof Error ? e.message : "카카오 로그인에 실패했습니다.";
//     res.redirect(`${scheme}://auth?error=${encodeURIComponent(message)}`);
//   }
// });

// GET /auth/me ---------------------------------------------------------------
router.get("/me", authMiddleware, (req: Request, res: Response) => {
  const user = db
    .prepare(
      "SELECT id, email, auth_provider, email_verified FROM users WHERE id = ?",
    )
    .get(req.user!.userId) as UserRow | undefined;

  if (!user) {
    sendError(res, 404, ERROR_CODES.NOT_FOUND, "사용자를 찾을 수 없습니다.");
    return;
  }
  res.json({ user: publicUser(user) });
});

// DELETE /auth/account -------------------------------------------------------
router.delete("/account", authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const user = db
    .prepare("SELECT id FROM users WHERE id = ?")
    .get(userId) as Pick<UserRow, "id"> | undefined;

  if (!user) {
    sendError(res, 404, ERROR_CODES.NOT_FOUND, "사용자를 찾을 수 없습니다.");
    return;
  }

  const deleteAccount = db.transaction(() => {
    db.prepare("DELETE FROM revoked_tokens WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM email_verifications WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_oauth WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });

  deleteAccount();
  res.json({ success: true });
});

// POST /auth/logout ----------------------------------------------------------
router.post("/logout", authMiddleware, (req: Request, res: Response) => {
  const claims = req.tokenClaims;
  if (claims?.jti && typeof claims.exp === "number") {
    revokeToken(claims.jti, claims.userId ?? null, claims.exp);
  }
  res.json({ success: true });
});

export default router;
