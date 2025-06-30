import { Types } from "mongoose";


export type TMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
};

export interface IConversation{
  userPhone: string; 
  title?: string;
  messages: TMessage[];
  createdAt: Date;
  updatedAt: Date;
}