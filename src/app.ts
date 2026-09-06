import express, { Application, Request, Response } from "express";
import cors from "cors";
import { corsOptions } from "./config/cors";
import cookieParser from "cookie-parser";


import globalErrorHandler from "./app/middlewares/globalErrorhandler";
import { UserRoutes } from "./app/modules/user/user.route";
import { AuthRoutes } from "./app/modules/auth/auth.route";
import { SensorDataRoutes } from "./app/modules/sensorData/sensorData.route";
import { PostRoutes } from "./app/modules/posts/post.route";
import { FieldRoutes } from "./app/modules/fields/fields.route";
import { UploadRoutes } from "./app/modules/upload/upload.route";
import { AdvisorySessionRoutes } from "./app/modules/advisorySession/advisorySession.route";
import { PublicRoutes } from "./app/modules/public/public.route";
import { AdminStatsRoutes } from "./app/modules/adminStats/adminStats.route";
import { FollowRoutes } from "./app/modules/follow/follow.route";
import { ExpertStatsRoutes } from "./app/modules/expertStats/expertStats.route";

const app: Application = express();

/**
 * One proxy hop is trusted, so `req.ip` is the visitor rather than Caddy.
 *
 * Without this every request arrives wearing the reverse proxy's address, and
 * since all the rate limiters key on the IP they become a single global budget:
 * the public telemetry allowance would be shared by every visitor at once, and
 * one person failing logins would lock out everybody.
 *
 * The count is 1, not `true`. The chain is Cloudflare -> Caddy -> here, and
 * Cloudflare appends the real client address to X-Forwarded-For after anything
 * the client sent itself. Trusting exactly one hop makes Express skip Caddy and
 * read that appended address; trusting more would let a caller prepend a
 * forged entry and be billed as somebody else.
 */
app.set("trust proxy", 1);

/**
 * The site, this API and the sensor simulator sit on three different
 * subdomains, so every browser call between them is cross-origin and carries
 * credentials. The allowlist lives in ./config/cors because the Socket.IO
 * handshake has to enforce exactly the same one.
 */
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

/**
 * =========================
 * Routes
 * =========================
 */
app.use("/user", UserRoutes);
app.use("/auth", AuthRoutes);
app.use("/sensorData", SensorDataRoutes);
app.use("/post", PostRoutes);
app.use("/field", FieldRoutes);
app.use("/upload", UploadRoutes);
app.use("/advisory", AdvisorySessionRoutes);
// The only routes reachable without a session; read-only and rate limited.
app.use("/public", PublicRoutes);
app.use("/admin", AdminStatsRoutes);
// Profiles and the follow graph, keyed by userCode.
app.use("/people", FollowRoutes);
app.use("/expert", ExpertStatsRoutes);

/**
 * =========================
 * Health Check
 * =========================
 */
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "FarmFlow API is running and accessible 🌍",
  });
});

/**
 * =========================
 * Global Error Handler (LAST)
 * =========================
 */
app.use(globalErrorHandler);

export default app;
