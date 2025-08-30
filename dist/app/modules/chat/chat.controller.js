"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatControllers = void 0;
const zod_1 = require("zod");
const chat_service_1 = require("./chat.service");
const chat_model_1 = __importDefault(require("./chat.model"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const chatRequestSchema = zod_1.z.object({
    userPhone: zod_1.z
        .string()
        .regex(/^\d{10,}$/, "Invalid user phone format: must be at least 10 digits"),
    conversationId: zod_1.z.string().optional(),
    messages: zod_1.z
        .array(zod_1.z.object({
        role: zod_1.z.enum(["user", "assistant", "system"]),
        content: zod_1.z.string().min(1, "Message content is required"),
    }))
        .optional()
        .default([]), // Allow empty messages array for new conversations
});
const handleChat = (0, catchAsync_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        const enrichedMessages = messages.map((msg) => (Object.assign(Object.assign({}, msg), { createdAt: new Date() })));
        console.log("chat.controller - Enriched messages:", enrichedMessages);
        let responseText = "";
        let savedConversationId;
        // If no messages and no conversationId, create an empty conversation
        if (!conversationId && enrichedMessages.length === 0) {
            const savedConversation = yield chat_model_1.default.create({
                userPhone,
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            savedConversationId = savedConversation._id.toString();
        }
        else {
            const response = yield chat_service_1.ChatServices.generateChatResponse(enrichedMessages, userPhone, undefined, conversationId);
            responseText = response.responseText;
            savedConversationId = response.conversationId;
        }
        res.status(200).json({
            success: true,
            message: enrichedMessages.length === 0
                ? "Empty conversation created successfully"
                : "Chat response generated successfully",
            data: { text: responseText, conversationId: savedConversationId },
        });
    }
    catch (error) {
        next(error);
    }
}));
const getMyChats = (0, catchAsync_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userPhone = req.params.userPhone;
    const conversations = yield chat_model_1.default.find({ userPhone }).sort({
        updatedAt: -1,
    });
    res.status(200).json({
        success: true,
        message: "Conversations retrieved successfully",
        data: conversations,
    });
}));
const deleteConversation = (0, catchAsync_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { conversationId } = req.params;
    const result = yield chat_service_1.ChatServices.deleteConversationById(conversationId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: result.message,
        data: result
    });
}));
exports.ChatControllers = {
    handleChat,
    getMyChats,
    deleteConversation
};
