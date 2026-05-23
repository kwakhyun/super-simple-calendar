import "dotenv/config";

import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { migrate } from "./db/migrate";
import authRoutes from "./routes/auth";
import { ERROR_CODES, sendError } from "./utils/http";

migrate();

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);
const IS_PROD = process.env.NODE_ENV === "production";

if (IS_PROD) {
  app.set("trust proxy", 1);
}

app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // No Origin header (native apps, curl) is always allowed.
      if (!origin) return cb(null, true);
      // In dev with no whitelist configured, allow everything.
      if (!IS_PROD && allowedOrigins.length === 0) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

// Per-endpoint rate limits (mounted before the router).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});
const signupLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 10,
});
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

app.use("/auth/login", authLimiter);
app.use("/auth/register", signupLimiter);
app.use("/auth/resend-verification", emailLimiter);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/auth", authRoutes);

app.use((_req: Request, res: Response) => {
  sendError(res, 404, ERROR_CODES.NOT_FOUND, "요청한 리소스를 찾을 수 없습니다.");
});

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[unhandled]", err);
    if (!res.headersSent) {
      sendError(res, 500, ERROR_CODES.INTERNAL, "서버 오류가 발생했습니다.");
    }
  },
);

const server = app.listen(PORT, () => {
  console.log(`🚀 Auth server listening on http://localhost:${PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
