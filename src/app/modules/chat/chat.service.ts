import { GoogleGenerativeAI, Content, GenerateContentStreamResult } from '@google/generative-ai';
import { Socket } from 'socket.io';
import config from '../../../config';
import Conversation from './chat.model';
import { TMessage } from './chat.interface';


const genAI = new GoogleGenerativeAI(config.gemini_api_key);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export const generateChatResponse = async (newMessages: TMessage[], socket?: Socket): Promise<string> => {
  const userPhone = '01812345672'; // Hardcoded userPhone declared in outer scope

  try {
    // Fetch existing conversation
    const existingConversation = await Conversation.findOne({ userPhone });
    let fullMessages: TMessage[] = [];

    if (existingConversation) {
      fullMessages = [...existingConversation.messages];
    }

    // Append new user message(s)
    fullMessages = [...fullMessages, ...newMessages];

    // Map full messages to Gemini's content format
    const contents: Content[] = fullMessages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model', // Gemini uses 'model' for assistant
      parts: [{ text: msg.content }],
    }));

    // console.log('chat.service - Sending to Gemini with full context:', contents);

    let responseText = '';

    if (socket) {
      // Streaming response
      const streamResult: GenerateContentStreamResult = await model.generateContentStream({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      for await (const chunk of streamResult.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          responseText += chunkText;
          socket.emit('chat:chunk', { text: chunkText });
          console.log('chat.service - Streaming chunk:', chunkText);
        }
      }
    } else {
      // Non-streaming response (for HTTP) - userPhone should come from controller
      throw new Error('Non-streaming mode not supported without userPhone from controller');
    }

    // Append new assistant message to the conversation
    const newAssistantMessage: TMessage = { role: 'assistant', content: responseText, createdAt: new Date() };
    if (existingConversation) {
      existingConversation.messages.push(...newMessages.slice(-1), newAssistantMessage); // Append new user message(s) and assistant response
      existingConversation.updatedAt = new Date();
      await existingConversation.save();
    } else {
      await Conversation.create({
        userPhone,
        messages: [...fullMessages, newAssistantMessage], // Include all messages and new assistant response
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return responseText;
  } catch (error) {
    console.error('chat.service - Error generating response:', error);
    throw new Error('Failed to generate chat response');
  }
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
