import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ChatServices } from "./chat.service";
import { TMessage } from "./chat.interface";
import Conversation from "./chat.model";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

const chatRequestSchema = z.object({
  userPhone: z
    .string()
    .regex(
      /^\d{10,}$/,
      "Invalid user phone format: must be at least 10 digits"
    ),
  conversationId: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1, "Message content is required"),
      })
    )
    .optional()
    .default([]), // Allow empty messages array for new conversations
});

const handleChat = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = chatRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      return next({
        status: 400,
        message: "Invalid request body",
        details: parseResult.error.format(),
      });
    }

    const { messages, userPhone, conversationId } = parseResult.data;

    try {
      // Add createdAt to each message to match TMessage type
      const enrichedMessages: TMessage[] = messages.map((msg) => ({
        ...msg,
        createdAt: new Date(),
      }));
      console.log("chat.controller - Enriched messages:", enrichedMessages);

      let responseText = "";
      let savedConversationId: string;

      // If no messages and no conversationId, create an empty conversation
      if (!conversationId && enrichedMessages.length === 0) {
        const savedConversation = await Conversation.create({
          userPhone,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        savedConversationId = savedConversation._id.toString();
      } else {
        const response = await ChatServices.generateChatResponse(
          enrichedMessages,
          userPhone,
          undefined,
          conversationId
        );
        responseText = response.responseText;
        savedConversationId = response.conversationId;
      }

      res.status(200).json({
        success: true,
        message:
          enrichedMessages.length === 0
            ? "Empty conversation created successfully"
            : "Chat response generated successfully",
        data: { text: responseText, conversationId: savedConversationId },
      });
    } catch (error) {
      next(error);
    }
  }
);

const getMyChats = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userPhone = req.params.userPhone;

    const conversations = await Conversation.find({ userPhone }).sort({
      updatedAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "Conversations retrieved successfully",
      data: conversations,
    });
  }
);


const deleteConversation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { conversationId } = req.params;

    const result = await ChatServices.deleteConversationById(conversationId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: result.message,
      data: result
    });
});

export const ChatControllers = {
  handleChat,
  getMyChats,
  deleteConversation
};
