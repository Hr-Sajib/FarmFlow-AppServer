import { Server, Socket } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";
import { z } from "zod";

import config from "../../../config";
import { UserModel } from "../user/user.model";
import { advisorySessionServices } from "./advisorySession.service";
import { IAdvisoryMessage } from "./advisorySession.interface";
import { TActor, senderRoleFor } from "./advisorySession.utils";

/** Socket carrying the authenticated caller, attached during the handshake. */
type AuthedSocket = Socket & { actor?: TActor };

const joinSchema = z.object({
  sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid session id"),
});

const messageSchema = z.object({
  sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid session id"),
  messageType: z.enum(["text", "image", "video"]).default("text"),
  messageContent: z.string().trim().min(1).max(5000),
});

const roomOf = (sessionId: string) => `session:${sessionId}`;

/**
 * Real-time transcript for advisory sessions.
 *
 * Mounted on its own namespace so its handshake authentication does not affect
 * the older, unauthenticated chat socket sharing the same server.
 *
 * Client:  io("<host>/advisory", { auth: { token: "<accessToken>" } })
 */
export const setupAdvisorySocket = (io: Server): void => {
  const nsp = io.of("/advisory");

  // --- 1. Authenticate the connection ------------------------------------
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

      socket.actor = {
        userId: user._id.toString(),
        role: user.role,
        userCode: user.userCode,
      };
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  // --- 2. Handle events --------------------------------------------------
  nsp.on("connection", (socket: AuthedSocket) => {
    const actor = socket.actor as TActor;

    /** Join a session's room and receive its transcript. */
    socket.on("session:join", async (payload: unknown) => {
      const parsed = joinSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("session:error", { message: "Invalid session id" });
        return;
      }

      try {
        // Authorises as well as loads: a caller who is neither the owning
        // farmer, the assigned expert, nor an admin is rejected here.
        const session = await advisorySessionServices.getSessionByIdFromDB(
          parsed.data.sessionId,
          actor
        );

        socket.join(roomOf(parsed.data.sessionId));
        socket.emit("session:history", {
          sessionId: parsed.data.sessionId,
          status: session.status,
          messages: session.chatHistory,
        });
      } catch (error) {
        socket.emit("session:error", {
          message: error instanceof Error ? error.message : "Could not join session",
        });
      }
    });

    /** Post a message; it is persisted, then broadcast to everyone in the room. */
    socket.on("session:message", async (payload: unknown) => {
      const parsed = messageSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("session:error", {
          message: parsed.error.issues[0]?.message ?? "Invalid message",
        });
        return;
      }

      const { sessionId, messageType, messageContent } = parsed.data;

      try {
        const session = await advisorySessionServices.getSessionByIdFromDB(
          sessionId,
          actor
        );

        if (session.status === "resolved" || session.status === "closed") {
          socket.emit("session:error", { message: "This session is closed" });
          return;
        }

        // senderRole is derived from the caller's own role, so a farmer cannot
        // post a message attributed to an expert or to the AI.
        const message: IAdvisoryMessage = {
          senderRole: senderRoleFor(actor),
          senderId: actor.userCode,
          messageType,
          messageContent,
          sentAt: new Date(),
        };

        await advisorySessionServices.appendMessageToSession(sessionId, message);

        nsp.to(roomOf(sessionId)).emit("session:message", { sessionId, message });
      } catch (error) {
        socket.emit("session:error", {
          message: error instanceof Error ? error.message : "Could not send message",
        });
      }
    });

    /** Leave a room without dropping the connection. */
    socket.on("session:leave", (payload: unknown) => {
      const parsed = joinSchema.safeParse(payload);
      if (parsed.success) socket.leave(roomOf(parsed.data.sessionId));
    });
  });
};

/*
 * Not implemented yet: when a farmer posts while status is "ai_active", the AI
 * reply would be generated here, appended with senderRole "ai", and broadcast
 * on the same "session:message" event. Deferred until the advisory layer moves
 * to OpenRouter.
 */
