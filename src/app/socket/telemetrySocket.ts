import { Server, Socket } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";

import config from "../../config";
import { UserModel } from "../modules/user/user.model";
import { ITelemetry } from "../modules/sensorData/sensorData.interface";

/** Held so the MQTT subscriber can broadcast without importing the server. */
let namespace: ReturnType<Server["of"]> | null = null;

type AuthedSocket = Socket & { farmerCode?: string; role?: string };

const roomOf = (farmerId: string) => `farmer:${farmerId}`;

/**
 * Live telemetry fan-out.
 *
 * Readings arrive over MQTT, are stored, then pushed to whoever is watching
 * that farm. Rooms are keyed by farmer code and joined from the verified
 * token, so a client cannot subscribe to another farm's readings.
 *
 * On its own namespace for the same reason as the advisory socket: handshake
 * auth here must not affect other sockets on the server.
 */
export const setupTelemetrySocket = (io: Server): void => {
  const nsp = io.of("/telemetry");
  namespace = nsp;

  nsp.use(async (socket: AuthedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(
        token,
        config.jwt_access_secret as string
      ) as JwtPayload;

      const user = await UserModel.findById(decoded.userId);
      if (!user || user.isDeleted || user.status === "blocked") {
        return next(new Error("Account is not active"));
      }

      socket.farmerCode = user.userCode;
      socket.role = user.role;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  nsp.on("connection", (socket: AuthedSocket) => {
    // A farmer watches their own farm. An admin may name one.
    socket.on("telemetry:watch", (payload: { farmerId?: string } = {}) => {
      const target =
        socket.role === "admin" && payload.farmerId
          ? payload.farmerId
          : socket.farmerCode;

      if (target) socket.join(roomOf(target));
    });

    socket.on("telemetry:unwatch", (payload: { farmerId?: string } = {}) => {
      const target = payload.farmerId ?? socket.farmerCode;
      if (target) socket.leave(roomOf(target));
    });
  });
};

/** Called by the MQTT subscriber once a reading has been persisted. */
export const broadcastTelemetry = (entry: ITelemetry): void => {
  namespace?.to(roomOf(entry.meta.farmerId)).emit("telemetry:update", {
    fieldId: entry.meta.fieldId,
    ts: entry.ts,
    temperature: entry.temperature,
    humidity: entry.humidity,
    soilMoisture: entry.soilMoisture,
    lightIntensity: entry.lightIntensity,
  });
};
