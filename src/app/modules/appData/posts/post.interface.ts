import { Types } from "mongoose";

export interface IPost {
    creatorName: string;
    creatorPhoto: string;
    creatorId: Types.ObjectId;
    postText: string;
    postImage: string;
    reactions: TReaction;
    comments: TComment[];
    postTopics: TPostTopic[];
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