import { Types } from "mongoose";

export interface IPost {
    creatorName: string;
    creatorId: Types.ObjectId;
    postText: string;
    postImages: string[];
    reactions: TReaction;
    comments: TComment[];
    aboutCrop: string;
}

export type TReaction = {
    likes: number;
    dislikes: number;
}

export type TComment = {
    commenterName: string;
    commenterId: Types.ObjectId; 
    commentText: string;
}