import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import globalErrorHandler from "./app/middlewares/globalErrorhandler";
import { UserRoutes } from "./app/modules/appData/user/user.route";
import { AuthRoutes } from "./app/modules/appData/auth/auth.route";
import sensorRoutes from "./app/modules/sensorData/sensorData.routes";
import { PostRoutes } from "./app/modules/appData/posts/post.route";
import { FieldRoutes } from "./app/modules/appData/fields/fields.route";
import { ChatRoutes } from "./app/modules/chat/chat.route";

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
app.use("/sensorData", sensorRoutes);
app.use("/post", PostRoutes);
app.use("/field", FieldRoutes);
app.use("/chat", ChatRoutes);

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
