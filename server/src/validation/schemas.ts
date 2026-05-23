import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("올바른 이메일 주소를 입력하세요."),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("올바른 이메일 주소를 입력하세요."),
  password: z.string().min(1, "비밀번호를 입력하세요."),
});

export const verifyEmailSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "6자리 인증 코드를 입력하세요."),
});

export const socialAuthSchema = z.object({
  provider: z.enum(["google", "kakao", "apple"]),
  // Google: access token. Apple: identity token. Kakao: authorization code.
  token: z.string().min(1, "토큰이 필요합니다."),
  // Kakao authorization-code flow requires the redirect URI used by the client.
  redirectUri: z.string().url().optional(),
  email: z.string().trim().toLowerCase().email().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type SocialAuthInput = z.infer<typeof socialAuthSchema>;
