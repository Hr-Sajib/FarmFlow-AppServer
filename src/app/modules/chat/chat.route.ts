import express from 'express';
import { handleChat, getMyChats } from './chat.controller';

const router = express.Router();

router.post('/', handleChat);
router.get('/my-chats/:userId', getMyChats);

export const ChatRoutes = router;