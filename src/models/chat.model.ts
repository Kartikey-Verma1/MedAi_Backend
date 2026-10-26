import type { Types } from "mongoose";
import { model, Schema } from "mongoose";
import User from "./user.model.js";

export interface IMessage{
    role: "user" | "assistant",
    content: string,
    createdAt: Date
}

interface IChat {
    userId: Types.ObjectId,
    documentId: Types.ObjectId,
    messages: IMessage[]
}

const messageSchema = new Schema<IMessage>({
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true,
    }
}, {_id: false});

const chatSchema = new Schema<IChat>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: User,
      required: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

chatSchema.index({ userId: 1, documentId: 1 }, { unique: true });

const Chat = model<IChat>("Chat", chatSchema);

export default Chat;