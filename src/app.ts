import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import config from "./config";

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
 * The site, this API and the sensor simulator sit on three different
 * subdomains, so every browser call between them is cross-origin and carries
 * credentials. CORS_ORIGINS names the ones allowed; with it unset the previous
 * reflect-anything behaviour remains, which is fine on localhost and is why
 * development needs no configuration.
 */
app.use(
  cors({
    origin: config.cors_origins.length ? config.cors_origins : true,
    credentials: true,
  })
);

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
