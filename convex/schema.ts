import {defineSchema, defineTable} from "convex/server";
import {v} from "convex/values";
import {UserRole} from "../types/roles";
import {MessageType} from "../types/messages";

const messageTypeLiterals = [
    v.literal(MessageType.textMessage),
    v.literal(MessageType.imageMessage),
    v.literal(MessageType.videoMessage),
    v.literal(MessageType.documentMessage),
    v.literal(MessageType.audioMessage),
] as const;

const textMessageSchema = v.object({
    content: v.string(),
});

const imageMessageSchema = v.object({
    url: v.string(),
    caption: v.optional(v.string()),
});

const videoMessageSchema = v.object({
    url: v.string(),
    caption: v.optional(v.string()),
    gifPlayback: v.boolean(),
});

const audioMessageSchema = v.object({
    url: v.string(),
});

const documentMessageSchema = v.object({
    mimetype: v.string(),
    url: v.string(),
    length: v.number(),
    caption: v.optional(v.string()),
    largeMediaError: v.optional(v.boolean()),
    jpegThumbnail: v.optional(v.string()),
    title: v.string(),
    pageCount: v.optional(v.number()),
    fileName: v.optional(v.string()),
});

const replyParticipantSchema = v.object({
    _id: v.id("users"),
    image: v.string(),
    name: v.optional(v.string()),
    tokenIdentifier: v.string(),
    email: v.string(),
    _creationTime: v.number(),
    isOnline: v.boolean(),
});

const replySchema = v.object({
    messageId: v.id("messages"),
    quotedConversationType: v.union(...messageTypeLiterals),
    quotedMessage: v.optional(v.any()),
    participant: v.optional(replyParticipantSchema),
});

const pushSubscriptionSchema = v.object({
    endpoint: v.string(),
    expirationTime: v.optional(v.number()),
    keys: v.object({
        p256dh: v.string(),
        auth: v.string(),
    }),
});

export default defineSchema({
    users: defineTable({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        image: v.string(),
        tokenIdentifier: v.string(),
        isOnline: v.boolean(),
        role: v.union(v.literal(UserRole.common), v.literal(UserRole.admin), v.literal(UserRole.superAdmin)),
    }).index("by_tokenIdentifier", ["tokenIdentifier"])
        .index("by_name", ["name"])
        .searchIndex("userSearchName", {
            searchField: "name"
        })
        .searchIndex("userSearchEmail", {
            searchField: "email"
        }),

    conversations: defineTable({
        participants: v.array(v.id("users")),
        isGroup: v.boolean(),
        groupName: v.optional(v.string()),
        groupImage: v.optional(v.string()),
        admins: v.optional(v.array(v.id("users"))),
    }),

    messages: defineTable({
        conversation: v.id("conversations"),
        sender: v.union(v.id("users"), v.literal("ChatGPT")),
        participant: v.optional(v.id("users")),
        textMessage: v.optional(textMessageSchema),
        imageMessage: v.optional(imageMessageSchema),
        videoMessage: v.optional(videoMessageSchema),
        documentMessage: v.optional(documentMessageSchema),
        audioMessage: v.optional(audioMessageSchema),
        reply: v.optional(replySchema),
        messageType: v.union(...messageTypeLiterals),
        receivers: v.optional(v.array(v.id("users"))),
        readers: v.optional(v.array(v.id("users"))),
        storageId: v.optional(v.id("_storage")),
    }).index("by_conversation", ["conversation"]),

    pushSubscriptions: defineTable({
        userId: v.id("users"),
        subscription: pushSubscriptionSchema,
    })
        .index("by_user", ["userId"])
        .index("by_user_endpoint", ["userId", "subscription.endpoint"]),
});
