import { Types } from "mongoose";

export interface IPost {
    creatorName: string;
    creatorId: Types.ObjectId;
    postText: string;
    postImages: string[];
    reactions: TReaction;
    comments: TComment[];
    postTopic: TPostTopic[];
}

export type TReaction = {
    likes: {
        count: number,
        by: Types.ObjectId[] 
    };
    dislikes: {
        count: number,
        by: Types.ObjectId[]
    };
}

export type TPostTopic =
  | 'rice'
  | 'potato'
  | 'onion'
  | 'disease'
  | 'insect'
  | 'fertilizer'
  | 'irrigation'
  | 'weather'
  | 'harvest'
  | 'equipment'
  | 'market'
  | 'pest'
  | 'technology';


export type TComment = {
    commenterName: string;
    commenterId: Types.ObjectId;
    commentText: string;
}