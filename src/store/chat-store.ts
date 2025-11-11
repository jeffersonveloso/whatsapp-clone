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

type PendingMessagesMap = Record<string, IMessage[]>;

type ConversationStore = {
  selectedConversation: Conversation | null;
  replyToMessage: IMessage | null;
  pendingMessages: PendingMessagesMap;
  setSelectedConversation: (conversation: Conversation | null) => void;
  setReplyToMessage: (message: IMessage | null) => void;
  clearReplyToMessage: () => void;
  addPendingMessage: (conversationId: Id<"conversations">, message: IMessage) => void;
  removePendingMessage: (conversationId: Id<"conversations">, messageId: IMessage["_id"]) => void;
  clearPendingMessages: (conversationId: Id<"conversations">) => void;
};

export const useConversationStore = create<ConversationStore>((set) => ({
  selectedConversation: null,
  replyToMessage: null,
  pendingMessages: {},
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
  addPendingMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.pendingMessages[conversationId] ?? [];
      return {
        pendingMessages: {
          ...state.pendingMessages,
          [conversationId]: [...existing, message],
        },
      };
    }),
  removePendingMessage: (conversationId, messageId) =>
    set((state) => {
      const existing = state.pendingMessages[conversationId];
      if (!existing) return {};

      const remaining = existing.filter((msg) => msg._id !== messageId);
      const nextPending = { ...state.pendingMessages };
      if (remaining.length) {
        nextPending[conversationId] = remaining;
      } else {
        delete nextPending[conversationId];
      }

      return { pendingMessages: nextPending };
    }),
  clearPendingMessages: (conversationId) =>
    set((state) => {
      if (!state.pendingMessages[conversationId]) return {};
      const nextPending = { ...state.pendingMessages };
      delete nextPending[conversationId];
      return { pendingMessages: nextPending };
    }),
}));

export interface IMessage {
  _id: Id<"messages">;
  conversation: Id<"conversations">;
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
    name: string | undefined;
    tokenIdentifier: string;
    email: string;
    _creationTime: number;
    isOnline: boolean;
  };
}
