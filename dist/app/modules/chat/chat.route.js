"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRoutes = void 0;
const express_1 = __importDefault(require("express"));
const chat_controller_1 = require("./chat.controller");
const router = express_1.default.Router();
router.post('/', chat_controller_1.ChatControllers.handleChat);
router.get('/my-chats/:userPhone', chat_controller_1.ChatControllers.getMyChats);
router.delete('/:conversationId', chat_controller_1.ChatControllers.deleteConversation);
exports.ChatRoutes = router;
