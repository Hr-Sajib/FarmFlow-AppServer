import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { generateChatResponse } from './chat.service';
import catchAsync from '../../utils/catchAsync';
import { Types } from 'mongoose';
import Conversation from './chat.model';
import { TMessage } from './chat.interface';

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1, 'Message content is required'),
      }),
    )
    .min(1, 'At least one message is required'),
});

export const handleChat = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const parseResult = chatRequestSchema.safeParse(req.body);

  if (!parseResult.success) {
    return next({
      status: 400,
      message: 'Invalid request body',
      details: parseResult.error.format(),
    });
  }

  const { messages } = parseResult.data;
  const userPhone = req.params.userPhone;

  if (!userPhone || !/^\+\d{1,4}\d{9,}$/.test(userPhone)) {
    return next({
      status: 401,
      message: 'Unauthorized: Invalid or missing User Phone',
    });
  }

  try {
    // Add createdAt to each message to match TMessage type
    const enrichedMessages: TMessage[] = messages.map((msg) => ({
      ...msg,
      createdAt: new Date(),
    }));
    console.log('chat.controller - Enriched messages:', enrichedMessages);

    const aiResponse = await generateChatResponse(enrichedMessages);

    const newMessage: TMessage = { role: 'assistant', content: aiResponse, createdAt: new Date() };
    await Conversation.create({
      userPhone,
      messages: [...enrichedMessages, newMessage],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Chat response generated successfully',
      data: { text: aiResponse },
    });
  } catch (error) {
    next(error);
  }
});

export const getMyChats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userPhone = "01812345672"; // hardcoded

  try {
    const conversations = await Conversation.find({ userPhone }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Conversations retrieved successfully',
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
});
