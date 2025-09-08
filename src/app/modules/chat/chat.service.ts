// import { GoogleGenerativeAI, Content, GenerateContentStreamResult } from '@google/generative-ai';
// import { Socket } from 'socket.io';
// import config from '../../../config';
// import Conversation from './chat.model';
// import { TMessage } from './chat.interface';

// const genAI = new GoogleGenerativeAI(config.gemini_api_key);
// const model = genAI.getGenerativeModel({ 
//   model: 'gemini-1.5-flash',
//     systemInstruction: `You are an agricultural expert specializing in farming, crop management, soil health, irrigation, and related topics. Always respond with accurate, practical advice tailored to agriculture. If a question is outside the domain of agriculture, politely decline to answer with a message like: "I'm sorry, I'm specialized in agriculture and can only assist with questions related to farming, crops, or soil management. Could you ask something about agriculture?" Provide clear, concise, and professional responses to help farmers and agricultural enthusiasts.`
//  });

// export const generateChatResponse = async (
//   newMessages: TMessage[],
//   userPhone: string,
//   socket?: Socket,
//   conversationId?: string,
// ): Promise<{ responseText: string; conversationId: string }> => {
//   try {
//     let fullMessages: TMessage[] = [];

//     if (conversationId) {
//       const existingConversation = await Conversation.findById(conversationId);
//       if (!existingConversation) {
//         throw new Error('Conversation not found');
//       }
//       if (existingConversation.userPhone !== userPhone) {
//         throw new Error('Unauthorized: Conversation does not belong to the user');
//       }
//       fullMessages = [...existingConversation.messages];
//     }

//     // Append new user message(s)
//     fullMessages = [...fullMessages, ...newMessages];

//     // If no messages, throw an error
//     if (fullMessages.length === 0) {
//       throw new Error('No messages provided for response generation');
//     }

//     // Map full messages to Gemini's content format
//     const contents: Content[] = fullMessages.map((msg) => ({
//       role: msg.role === 'user' ? 'user' : 'model', // Gemini uses 'model' for assistant
//       parts: [{ text: msg.content }],
//     }));


//     let responseText = '';

//     if (socket) {
//       // Streaming response
//       const streamResult: GenerateContentStreamResult = await model.generateContentStream({
//         contents,
//         generationConfig: {
//           temperature: 0.7,
//           maxOutputTokens: 1000,
//         },
//       });

//       for await (const chunk of streamResult.stream) {
//         const chunkText = chunk.text();
//         if (chunkText) {
//           responseText += chunkText;
//           socket.emit('chat:chunk', { text: chunkText });
//         }
//       }
//     } else {
//       // Non-streaming response (for HTTP)
//       const result = await model.generateContent({
//         contents,
//         generationConfig: {
//           temperature: 0.7,
//           maxOutputTokens: 1000,
//         },
//       });
//       responseText = result.response.text();
//     }

//     // Append new assistant message to the conversation
//     const newAssistantMessage: TMessage = { role: 'assistant', content: responseText, createdAt: new Date() };
//     let savedConversation;
//     if (conversationId) {
//       savedConversation = await Conversation.findByIdAndUpdate(
//         conversationId,
//         {
//           $push: { messages: { $each: [...newMessages.slice(-1), newAssistantMessage] } },
//           updatedAt: new Date(),
//         },
//         { new: true },
//       );
//     } else {
//       savedConversation = await Conversation.create({
//         userPhone,
//         messages: [...fullMessages, newAssistantMessage],
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       });
//     }

//     if (!savedConversation) {
//       throw new Error('Failed to save conversation');
//     }

//     return { responseText, conversationId: savedConversation._id.toString() };
//   } catch (error) {
//     console.error('chat.service - Error generating response:', error);
//     throw new Error('Failed to generate chat response');
//   }
// };


// const deleteConversationById = async (conversationId: string): Promise<{ message: string }> => {
//     const existingConversation = await Conversation.findById(conversationId);
//     if (!existingConversation) {
//       throw new Error('Conversation not found');
//     }

//     await Conversation.findByIdAndDelete(conversationId);

//     return { message: 'Conversation deleted successfully' };
// };


// export const ChatServices = {
//   generateChatResponse,
//   deleteConversationById
// }

import { GoogleGenerativeAI, Content, GenerateContentStreamResult } from '@google/generative-ai';
import { Socket } from 'socket.io';
import config from '../../../config';
import Conversation from './chat.model';
import { TMessage } from './chat.interface';

const genAI = new GoogleGenerativeAI(config.gemini_api_key);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: `You are an agricultural expert specializing in farming, crop management, soil health, irrigation, and related topics. Always respond with accurate, practical advice tailored to agriculture in bangla or english based on the question language. If a question is outside the domain of agriculture, politely decline to answer with a message like: "I'm sorry, I'm specialized in agriculture and can only assist with questions related to farming, crops, or soil management. Could you ask something about agriculture?" Provide clear, concise, and professional responses to help farmers and agricultural enthusiasts.`
});

export const generateChatResponse = async (
  newMessages: TMessage[],
  userPhone: string,
  socket?: Socket,
  conversationId?: string,
): Promise<{ responseText: string; conversationId: string }> => {
  try {
    let fullMessages: TMessage[] = [];

    if (conversationId) {
      const existingConversation = await Conversation.findById(conversationId);
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
    const contents: Content[] = fullMessages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

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
        }
      }
    } else {
      // Non-streaming response (for HTTP)
      const result = await model.generateContent({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });
      responseText = result.response.text();
    }

    // Append new assistant message to the conversation
    const newAssistantMessage: TMessage = { role: 'assistant', content: responseText, createdAt: new Date() };
    let savedConversation;
    if (conversationId) {
      savedConversation = await Conversation.findByIdAndUpdate(
        conversationId,
        {
          $push: { messages: { $each: [...newMessages.slice(-1), newAssistantMessage] } },
          updatedAt: new Date(),
        },
        { new: true },
      );
    } else {
      savedConversation = await Conversation.create({
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
  } catch (error) {
    console.error('chat.service - Error generating response:', error);
    throw new Error('Failed to generate chat response');
  }
};

const deleteConversationById = async (conversationId: string): Promise<{ message: string }> => {
  const existingConversation = await Conversation.findById(conversationId);
  if (!existingConversation) {
    throw new Error('Conversation not found');
  }

  await Conversation.findByIdAndDelete(conversationId);

  return { message: 'Conversation deleted successfully' };
};

export const ChatServices = {
  generateChatResponse,
  deleteConversationById
};