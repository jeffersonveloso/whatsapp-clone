import { Id } from "../../convex/_generated/dataModel";
import { create } from "zustand";
import {
  AudioMessageEntity,
  DocumentMessageEntity,
  ImageMessageEntity,
  MessageType,
  ReplyEntity,
  ReplyParticipantSnapshot,
  TextMessageEntity,
  VideoMessageEntity,
} from "../../types/messages";

type MessageReply = ReplyEntity<Id<"users">, Id<"messages">>;
type MessageReplyParticipant = ReplyParticipantSnapshot<Id<"users">>;

export type Conversation = {
  _id: Id<"conversations">;
  image?: string;
  participants: Id<"users">[];
  isGroup: boolean;
  name?: string;
  groupImage?: string;
  groupName?: string;
  admins?: Id<"users">[];
  isOnline?: boolean;
  lastMessage?: {
    _id: Id<"messages">;
    conversation: Id<"conversations">;
    textMessage?: TextMessageEntity;
    imageMessage?: ImageMessageEntity;
    videoMessage?: VideoMessageEntity;
    documentMessage?: DocumentMessageEntity;
    audioMessage?: AudioMessageEntity;
    messageType: MessageType;
    sender: Id<"users"> | "ChatGPT";
    participant?: Id<"users">;
  };
};

type ConversationStore = {
  selectedConversation: Conversation | null;
  replyToMessage: IMessage | null;
  setSelectedConversation: (conversation: Conversation | null) => void;
  setReplyToMessage: (message: IMessage | null) => void;
  clearReplyToMessage: () => void;
};

export const useConversationStore = create<ConversationStore>((set) => ({
  selectedConversation: null,
  replyToMessage: null,
  setSelectedConversation: (conversation) =>
    set((state) => ({
      selectedConversation: conversation,
      replyToMessage:
        conversation &&
        state.selectedConversation &&
        state.selectedConversation._id === conversation._id
          ? state.replyToMessage
          : null,
    })),
  setReplyToMessage: (message) => set({ replyToMessage: message }),
  clearReplyToMessage: () => set({ replyToMessage: null }),
}));

export interface IMessage {
  _id: Id<"messages">;
  textMessage?: TextMessageEntity;
  imageMessage?: ImageMessageEntity;
  videoMessage?: VideoMessageEntity;
  documentMessage?: DocumentMessageEntity;
  audioMessage?: AudioMessageEntity;
  reply?: MessageReply;
  _creationTime: number;
  messageType: MessageType;
  receivers?: Id<"users">[];
  readers?: Id<"users">[];
  participant?: MessageReplyParticipant;
  sender: {
    _id: Id<"users">;
    image: string;
    name?: string;
    tokenIdentifier: string;
    email: string;
    _creationTime: number;
    isOnline: boolean;
  };
}
