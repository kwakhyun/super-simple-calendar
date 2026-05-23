import { createPublicKey } from "node:crypto";

import jwt from "jsonwebtoken";

export type OAuthProfile = {
  id: string;
  email: string | null;
};

/** Google: verify the access token by calling the userinfo endpoint. */
export async function verifyGoogleToken(
  accessToken: string,
): Promise<OAuthProfile> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error("Google 토큰 검증에 실패했습니다.");
  }
  const data = (await res.json()) as { sub: string; email?: string };
  return { id: data.sub, email: data.email ?? null };
}

type AppleKey = {
  kid: string;
  kty: string;
  use: string;
  alg: string;
  n: string;
  e: string;
};

let appleKeysCache: { keys: AppleKey[]; fetchedAt: number } | null = null;
const APPLE_KEYS_TTL_MS = 60 * 60 * 1000;

async function getAppleKeys(): Promise<AppleKey[]> {
  if (
    appleKeysCache &&
    Date.now() - appleKeysCache.fetchedAt < APPLE_KEYS_TTL_MS
  ) {
    return appleKeysCache.keys;
  }
  const res = await fetch("https://appleid.apple.com/auth/keys");
  if (!res.ok) {
    throw new Error("Apple 공개 키를 가져오지 못했습니다.");
  }
  const data = (await res.json()) as { keys: AppleKey[] };
  appleKeysCache = { keys: data.keys, fetchedAt: Date.now() };
  return data.keys;
}

/** Apple: verify the identity token (JWT) against Apple's public keys. */
export async function verifyAppleToken(
  identityToken: string,
): Promise<OAuthProfile> {
  const decoded = jwt.decode(identityToken, { complete: true });
  const kid =
    decoded && typeof decoded === "object"
      ? (decoded.header?.kid as string | undefined)
      : undefined;

  if (!kid) {
    throw new Error("Apple 토큰 형식이 올바르지 않습니다.");
  }

  const keys = await getAppleKeys();
  const key = keys.find((k) => k.kid === kid);
  if (!key) {
    throw new Error("Apple 공개 키를 찾을 수 없습니다.");
  }

  const publicKey = createPublicKey({
    key: { kty: key.kty, n: key.n, e: key.e },
    format: "jwk",
  });

  const payload = jwt.verify(identityToken, publicKey, {
    algorithms: ["RS256"],
    issuer: "https://appleid.apple.com",
    audience: process.env.APPLE_BUNDLE_ID || "com.torinana.supersimplecalendar",
  }) as { sub?: string; email?: string };

  if (!payload.sub) {
    throw new Error("Apple 토큰 검증에 실패했습니다.");
  }

  return { id: payload.sub, email: payload.email ?? null };
}

/** Kakao: exchange the authorization code, then fetch the user profile. */
export async function verifyKakaoCode(
  code: string,
  redirectUri: string,
): Promise<OAuthProfile> {
  const kakaoKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoKey) {
    throw new Error("카카오 REST API 키가 설정되지 않았습니다.");
  }

  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: kakaoKey,
      redirect_uri: redirectUri,
      code,
      client_secret: process.env.KAKAO_CLIENT_SECRET || "",
    }).toString(),
  });

  if (!tokenRes.ok) {
    throw new Error("카카오 토큰 교환에 실패했습니다.");
  }
  const tokenData = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) {
    throw new Error("카카오 사용자 정보 조회에 실패했습니다.");
  }
  const userData = (await userRes.json()) as {
    id: number;
    kakao_account?: { email?: string };
  };

  return {
    id: String(userData.id),
    email: userData.kakao_account?.email ?? null,
  };
}
