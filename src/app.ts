import express, { Application, Request, Response } from "express";
import cors from "cors";
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

const app: Application = express();

/**
 * =========================
 * 🌍 OPEN CORS (NO CRASH)
 * =========================
 */
app.use(
  cors({
    origin: true, // ✅ allow ANY origin dynamically
    credentials: true, // keep working auth
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
