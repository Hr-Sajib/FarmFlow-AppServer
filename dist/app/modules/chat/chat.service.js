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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatServices = exports.generateChatResponse = void 0;
const generative_ai_1 = require("@google/generative-ai");
const config_1 = __importDefault(require("../../../config"));
const chat_model_1 = __importDefault(require("./chat.model"));
const genAI = new generative_ai_1.GoogleGenerativeAI(config_1.default.gemini_api_key);
// Use one of these models - they all support generateContent
// Best options: gemini-2.5-flash, gemini-flash-latest, or gemini-2.0-flash
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash', // Latest stable model
    systemInstruction: `You are an agricultural expert specializing in farming, crop management, soil health, irrigation, and related topics. Always respond with accurate, practical advice tailored to agriculture in bangla or english based on the question language. If a question is outside the domain of agriculture, politely decline to answer with a message like: "I'm sorry, I'm specialized in agriculture and can only assist with questions related to farming, crops, or soil management. Could you ask something about agriculture?" Provide clear, concise, and professional responses to help farmers and agricultural enthusiasts.`
});
const generateChatResponse = (newMessages, userPhone, socket, conversationId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    try {
        let fullMessages = [];
        if (conversationId) {
            const existingConversation = yield chat_model_1.default.findById(conversationId);
            if (!existingConversation) {
                throw new Error('Conversation not found');
            }
            if (existingConversation.userPhone !== userPhone) {
                throw new Error('Unauthorized: Conversation does not belong to the user');
            }
            fullMessages = [...existingConversation.messages];
        }
        // Append new user message(s)
        fullMessages = [...fullMessages, ...newMessages];
        // If no messages, throw an error
        if (fullMessages.length === 0) {
            throw new Error('No messages provided for response generation');
        }
        // Map full messages to Gemini's content format
        const contents = fullMessages.map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));
        let responseText = '';
        if (socket) {
            // For socket connections, use streaming approach with generateContentStream
            // Note: This requires the model to support streaming
            try {
                const streamResult = yield model.generateContentStream({
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000,
                    },
                });
                try {
                    for (var _d = true, _e = __asyncValues(streamResult.stream), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                        _c = _f.value;
                        _d = false;
                        const chunk = _c;
                        const chunkText = chunk.text();
                        if (chunkText) {
                            responseText += chunkText;
                            socket.emit('chat:chunk', { text: chunkText });
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            catch (streamError) {
                // Fallback: If streaming fails, use regular generation and emit as one chunk
                console.warn('Streaming failed, falling back to regular generation:', streamError);
                const result = yield model.generateContent({
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000,
                    },
                });
                responseText = result.response.text();
                socket.emit('chat:chunk', { text: responseText });
            }
        }
        else {
            // Non-streaming response (for HTTP)
            const result = yield model.generateContent({
                contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                },
            });
            responseText = result.response.text();
        }
        // Append new assistant message to the conversation
        const newAssistantMessage = { role: 'assistant', content: responseText, createdAt: new Date() };
        let savedConversation;
        if (conversationId) {
            savedConversation = yield chat_model_1.default.findByIdAndUpdate(conversationId, {
                $push: { messages: { $each: [...newMessages.slice(-1), newAssistantMessage] } },
                updatedAt: new Date(),
            }, { new: true });
        }
        else {
            savedConversation = yield chat_model_1.default.create({
                userPhone,
                messages: [...fullMessages, newAssistantMessage],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        if (!savedConversation) {
            throw new Error('Failed to save conversation');
        }
        return { responseText, conversationId: savedConversation._id.toString() };
    }
    catch (error) {
        console.error('chat.service - Error generating response:', error);
        throw new Error('Failed to generate chat response');
    }
});
exports.generateChatResponse = generateChatResponse;
const deleteConversationById = (conversationId) => __awaiter(void 0, void 0, void 0, function* () {
    const existingConversation = yield chat_model_1.default.findById(conversationId);
    if (!existingConversation) {
        throw new Error('Conversation not found');
    }
    yield chat_model_1.default.findByIdAndDelete(conversationId);
    return { message: 'Conversation deleted successfully' };
});
exports.ChatServices = {
    generateChatResponse: exports.generateChatResponse,
    deleteConversationById
};
