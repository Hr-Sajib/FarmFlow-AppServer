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
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupChatSocket = void 0;
const zod_1 = require("zod");
const chat_service_1 = require("./chat.service");
const chatRequestSchema = zod_1.z.object({
    userPhone: zod_1.z.string().regex(/^\d{10,}$/, 'Invalid user phone format: must be at least 10 digits'),
    conversationId: zod_1.z.string().optional(),
    messages: zod_1.z
        .array(zod_1.z.object({
        role: zod_1.z.enum(['user', 'assistant', 'system']),
        content: zod_1.z.string().min(1, 'Message content is required'),
    }))
        .min(1, 'At least one message is required'),
});
const setupChatSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('Socket.IO - Client connected:', socket.id);
        socket.on('chat', (data) => __awaiter(void 0, void 0, void 0, function* () {
            console.log('chat.socket - Received chat event with data:', data);
            try {
                const parseResult = chatRequestSchema.safeParse(data);
                console.log('chat.socket - Zod parse result:', parseResult);
                if (!parseResult.success) {
                    const errorDetails = {
                        message: 'Invalid request body',
                        details: parseResult.error.format(),
                    };
                    console.log('chat.socket - Validation failed:', errorDetails);
                    socket.emit('chat:error', errorDetails);
                    return;
                }
                const { messages, userPhone, conversationId } = parseResult.data;
                console.log('chat.socket - Validated messages:', messages, 'userPhone:', userPhone, 'conversationId:', conversationId);
                // Add createdAt to each message to match TMessage type
                const enrichedMessages = messages.map((msg) => (Object.assign(Object.assign({}, msg), { createdAt: new Date() })));
                // Emit 'chat:start' to indicate processing
                socket.emit('chat:start');
                // Stream response
                console.log('chat.socket - Calling generateChatResponse with enriched messages:', enrichedMessages, 'userPhone:', userPhone, 'conversationId:', conversationId);
                yield (0, chat_service_1.generateChatResponse)(enrichedMessages, userPhone, socket, conversationId);
                console.log('chat.socket - generateChatResponse completed');
                // Emit 'chat:end' when streaming is complete
                socket.emit('chat:end');
                console.log('chat.socket - Emitted chat:end');
            }
            catch (error) {
                console.error('chat.socket - Error processing chat event:', error);
                socket.emit('chat:error', {
                    message: 'Failed to generate chat response',
                    details: error instanceof Error ? error.stack : String(error),
                });
            }
        }));
        socket.on('disconnect', () => {
            console.log('Socket.IO - Client disconnected:', socket.id);
        });
    });
};
exports.setupChatSocket = setupChatSocket;
