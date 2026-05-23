import { db } from "./connection";

/**
 * Schema follows the Jurnee server conventions (raw SQL, run on startup),
 * trimmed to what the calendar app needs: accounts + auth only.
 */
export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      auth_provider TEXT NOT NULL DEFAULT 'email', -- 'email' | 'google' | 'kakao' | 'apple'
      email_verified INTEGER NOT NULL DEFAULT 0,   -- 0=false, 1=true
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_oauth (
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,        -- 'google' | 'kakao' | 'apple'
      provider_id TEXT NOT NULL,     -- provider's stable user id
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (provider, provider_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,            -- 6-digit code
      expires_at TEXT NOT NULL,      -- 10 minutes from creation
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_email_verifications_user
      ON email_verifications(user_id);

    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti TEXT PRIMARY KEY,
      user_id TEXT,
      exp INTEGER NOT NULL,          -- JWT expiry (unix seconds)
      revoked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_revoked_tokens_exp
      ON revoked_tokens(exp);
  `);
}

// Allow `npm run db:migrate`
if (require.main === module) {
  migrate();
  console.log("✅ Migration complete");
}
