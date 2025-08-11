import express from 'express';
import { ChatControllers } from './chat.controller';

const router = express.Router();

router.post('/', ChatControllers.handleChat);
router.get('/my-chats/:userPhone', ChatControllers.getMyChats);
router.delete('/:conversationId', ChatControllers.deleteConversation);

export const ChatRoutes = router;