import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { generateChatResponse } from './chat.service';
import { TMessage } from './chat.interface';

const chatRequestSchema = z.object({
  userPhone: z.string().regex(/^\d{10,}$/, 'Invalid user phone format: must be at least 10 digits'),
  conversationId: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1, 'Message content is required'),
      }),
    )
    .min(1, 'At least one message is required'),
});

export const setupChatSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('Socket.IO - Client connected:', socket.id);

    socket.on('chat', async (data: unknown) => {
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
        const enrichedMessages: TMessage[] = messages.map((msg) => ({
          ...msg,
          createdAt: new Date(),
        }));

        // Emit 'chat:start' to indicate processing
        socket.emit('chat:start');

        // Stream response
        console.log('chat.socket - Calling generateChatResponse with enriched messages:', enrichedMessages, 'userPhone:', userPhone, 'conversationId:', conversationId);
        await generateChatResponse(enrichedMessages, userPhone, socket, conversationId);
        console.log('chat.socket - generateChatResponse completed');

        // Emit 'chat:end' when streaming is complete
        socket.emit('chat:end');
        console.log('chat.socket - Emitted chat:end');
      } catch (error) {
        console.error('chat.socket - Error processing chat event:', error);
        socket.emit('chat:error', {
          message: 'Failed to generate chat response',
          details: error instanceof Error ? error.stack : String(error),
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO - Client disconnected:', socket.id);
    });
  });
};