import mongoose, { Schema, Document } from 'mongoose';
import { IConversation, TMessage } from './chat.interface';


const messageSchema = new Schema<TMessage>({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const conversationSchema = new Schema<IConversation>(
  {
    userPhone: {
      type: String,
      required: true,
    },
    title: { type: String },
    messages: [messageSchema],
  },
  {
    timestamps: true, 
  }
);

// Index for userPhone to optimize queries
conversationSchema.index({ userPhone: 1 });

const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);

export default Conversation;