import {ConvexError, v} from "convex/values";
import {mutation, query, MutationCtx, QueryCtx} from "./_generated/server";
import {api} from "./_generated/api";
import {Id} from "./_generated/dataModel";
import {MessageType} from "../types/messages";

const replyInputValidator = v.optional(
    v.object({
        messageId: v.id("messages"),
    })
);

const extractQuotedMessage = (message: any) => {
    switch (message.messageType) {
        case MessageType.textMessage:
            return message.textMessage;
        case MessageType.imageMessage:
            return message.imageMessage;
        case MessageType.videoMessage:
            return message.videoMessage;
        case MessageType.documentMessage:
            return message.documentMessage;
        case MessageType.audioMessage:
            return message.audioMessage;
        default:
            return undefined;
    }
};

const buildParticipantSnapshot = (user: any) => {
    if (!user) return undefined;
    return {
        _id: user._id,
        image: user.image,
        name: user.name ?? undefined,
        tokenIdentifier: user.tokenIdentifier,
        email: user.email ?? "",
        _creationTime: user._creationTime,
        isOnline: user.isOnline,
    };
};

const buildReplyPayload = async (
    ctx: MutationCtx,
    replyInput: { messageId: Id<"messages"> } | null | undefined
) => {
    if (!replyInput) return undefined;

    const originalMessage = await ctx.db.get(replyInput.messageId);
    if (!originalMessage) {
        return undefined;
    }

    let participantSnapshot;
    if (originalMessage.sender !== "ChatGPT") {
        const tempCache = new Map<string, ReturnType<typeof buildParticipantSnapshot> | undefined>();
        participantSnapshot = await hydrateUserSnapshot(
            ctx,
            tempCache,
            originalMessage.sender as Id<"users">
        );
    }

    return {
        messageId: originalMessage._id,
        quotedConversationType: originalMessage.messageType,
        quotedMessage: extractQuotedMessage(originalMessage),
        participant: participantSnapshot,
    };
};

const hydrateUserSnapshot = async (
    ctx: MutationCtx | QueryCtx,
    cache: Map<string, ReturnType<typeof buildParticipantSnapshot> | undefined>,
    userId: Id<"users">
) => {
    const cacheKey = userId.toString();
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const user = await ctx.db.get(userId);
    const snapshot =
        user ??
        {
            _id: userId,
            image: "/placeholder.png",
            name: undefined,
            tokenIdentifier: "",
            email: "",
            _creationTime: Date.now(),
            isOnline: false,
        };
    const formattedSnapshot = buildParticipantSnapshot(snapshot);
    if (!formattedSnapshot) {
        const fallback = {
            _id: userId,
            image: "/placeholder.png",
            name: undefined,
            tokenIdentifier: "",
            email: "",
            _creationTime: Date.now(),
            isOnline: false,
        };
        cache.set(cacheKey, fallback);
        return fallback;
    }

    cache.set(cacheKey, formattedSnapshot);
    return formattedSnapshot;
};
export const sendTextMessage = mutation({
    args: {
        sender: v.id("users"),
        content: v.string(),
        conversation: v.id("conversations"),
        replyTo: replyInputValidator,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Not authenticated");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) {
            throw new ConvexError("User not found");
        }

        const conversation = await ctx.db
            .query("conversations")
            .filter((q) => q.eq(q.field("_id"), args.conversation))
            .first();

        if (!conversation) {
            throw new ConvexError("Conversation not found");
        }

        if (!conversation.participants.includes(user._id)) {
            throw new ConvexError("You are not part of this conversation");
        }

        if (args.sender !== user._id) {
            throw new ConvexError("Invalid sender provided");
        }

        const replyPayload = await buildReplyPayload(ctx, args.replyTo ?? null);
        const receivers = conversation.participants.filter((id) => id !== user._id);

        await ctx.db.insert("messages", {
            sender: args.sender,
            participant: args.sender,
            textMessage: { content: args.content },
            conversation: args.conversation,
            messageType: MessageType.textMessage,
            receivers,
            readers: [user._id],
            reply: replyPayload,
        });

        // TODO => add @gpt check later
        if (args.content.startsWith("@gpt")) {
            // Schedule the chat action to run immediately
            await ctx.scheduler.runAfter(0, api.openai.chat, {
                messageBody: args.content,
                conversation: args.conversation,
            });
        }

        if (args.content.startsWith("@dall-e")) {
            await ctx.scheduler.runAfter(0, api.openai.dall_e, {
                messageBody: args.content,
                conversation: args.conversation,
            });
        }
    },
});

export const sendChatGPTMessage = mutation({
    args: {
        content: v.string(),
        conversation: v.id("conversations"),
        messageType: v.union(v.literal(MessageType.textMessage), v.literal(MessageType.imageMessage)),
    },
    handler: async (ctx, args) => {
        const baseMessage = {
            sender: "ChatGPT" as const,
            conversation: args.conversation,
            messageType: args.messageType,
        };

        if (args.messageType === MessageType.imageMessage) {
            await ctx.db.insert("messages", {
                ...baseMessage,
                imageMessage: { url: args.content },
            });
            return;
        }

        await ctx.db.insert("messages", {
            ...baseMessage,
            textMessage: { content: args.content },
        });
    },
});

// Optimized
export const getMessages = query({
    args: {
        conversation: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversation", args.conversation))
            .collect();

        const userProfileCache = new Map<string, ReturnType<typeof buildParticipantSnapshot> | undefined>();

        return await Promise.all(
            messages.map(async (message) => {
                let senderSnapshot;
                if (message.sender === "ChatGPT") {
                    const image =
                        message.messageType === MessageType.imageMessage
                            ? "/dall-e.png"
                            : "/gpt.png";
                    senderSnapshot = {
                        _id: "chatgpt" as unknown as Id<"users">,
                        image,
                        name: "ChatGPT",
                        tokenIdentifier: "system|chatgpt",
                        email: "chatgpt@openai.com",
                        _creationTime: message._creationTime,
                        isOnline: true,
                    };
                } else {
                    senderSnapshot = await hydrateUserSnapshot(
                        ctx,
                        userProfileCache,
                        message.sender as Id<"users">
                    );
                }

                let participantSnapshot = undefined;
                if (message.participant) {
                    participantSnapshot = await hydrateUserSnapshot(
                        ctx,
                        userProfileCache,
                        message.participant as Id<"users">
                    );
                }

                return {
                    ...message,
                    sender: senderSnapshot,
                    participant: participantSnapshot,
                };
            })
        );
    },
});

export const sendImage = mutation({
    args: {
        imgId: v.id("_storage"),
        sender: v.id("users"),
        conversation: v.id("conversations"),
        caption: v.optional(v.string()),
        replyTo: replyInputValidator,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Unauthorized");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) {
            throw new ConvexError("User not found");
        }

        const conversation = await ctx.db.get(args.conversation);
        if (!conversation) {
            throw new ConvexError("Conversation not found");
        }

        if (!conversation.participants.includes(user._id)) {
            throw new ConvexError("You are not part of this conversation");
        }

        if (args.sender !== user._id) {
            throw new ConvexError("Invalid sender provided");
        }

        const content = (await ctx.storage.getUrl(args.imgId)) as string;
        const replyPayload = await buildReplyPayload(ctx, args.replyTo ?? null);
        const receivers = conversation.participants.filter((id) => id !== user._id);

        await ctx.db.insert("messages", {
            sender: args.sender,
            participant: args.sender,
            imageMessage: {
                url: content,
                caption: args.caption ?? undefined,
            },
            messageType: MessageType.imageMessage,
            conversation: args.conversation,
            storageId: args.imgId,
            receivers,
            readers: [user._id],
            reply: replyPayload,
        });
    },
});

export const sendVideo = mutation({
    args: {
        videoId: v.id("_storage"),
        sender: v.id("users"),
        conversation: v.id("conversations"),
        caption: v.optional(v.string()),
        gifPlayback: v.optional(v.boolean()),
        replyTo: replyInputValidator,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Unauthorized");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) {
            throw new ConvexError("User not found");
        }

        const conversation = await ctx.db.get(args.conversation);
        if (!conversation) {
            throw new ConvexError("Conversation not found");
        }

        if (!conversation.participants.includes(user._id)) {
            throw new ConvexError("You are not part of this conversation");
        }

        if (args.sender !== user._id) {
            throw new ConvexError("Invalid sender provided");
        }

        const content = (await ctx.storage.getUrl(args.videoId)) as string;
        const replyPayload = await buildReplyPayload(ctx, args.replyTo ?? null);
        const receivers = conversation.participants.filter((id) => id !== user._id);

        await ctx.db.insert("messages", {
            sender: args.sender,
            participant: args.sender,
            videoMessage: {
                url: content,
                caption: args.caption ?? undefined,
                gifPlayback: args.gifPlayback ?? false,
            },
            messageType: MessageType.videoMessage,
            conversation: args.conversation,
            storageId: args.videoId,
            receivers,
            readers: [user._id],
            reply: replyPayload,
        });
    },
});

export const sendAudio = mutation({
    args: {
        audioId: v.id("_storage"),
        sender: v.id("users"),
        conversation: v.id("conversations"),
        replyTo: replyInputValidator,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Unauthorized");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) {
            throw new ConvexError("User not found");
        }

        const conversation = await ctx.db.get(args.conversation);
        if (!conversation) {
            throw new ConvexError("Conversation not found");
        }

        if (!conversation.participants.includes(user._id)) {
            throw new ConvexError("You are not part of this conversation");
        }

        if (args.sender !== user._id) {
            throw new ConvexError("Invalid sender provided");
        }

        const content = (await ctx.storage.getUrl(args.audioId)) as string;
        const replyPayload = await buildReplyPayload(ctx, args.replyTo ?? null);
        const receivers = conversation.participants.filter((id) => id !== user._id);

        await ctx.db.insert("messages", {
            sender: args.sender,
            participant: args.sender,
            audioMessage: {
                url: content,
            },
            messageType: MessageType.audioMessage,
            conversation: args.conversation,
            storageId: args.audioId,
            receivers,
            readers: [user._id],
            reply: replyPayload,
        });
    },
});

export const deleteMessage = mutation({
    args: {
        messageId: v.id("messages")
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError("Unauthorized");

        const message = await ctx.db
            .query("messages")
            .filter((q) => q.eq(q.field("_id"), args.messageId))
            .unique();

        if (!message) throw new ConvexError("Message not found");

        const storageId = message.storageId;

        if (storageId) {
            await ctx.storage.delete(storageId);
        }

        await ctx.db.patch(args.messageId, {
            messageType: MessageType.textMessage,
            textMessage: { content: "This message was deleted" },
            imageMessage: undefined,
            videoMessage: undefined,
            documentMessage: undefined,
            audioMessage: undefined,
            reply: undefined,
            storageId: undefined,
        });
    },
});

export const DestroyMessage = mutation({
    args: {
        messageId: v.id("messages")
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError("Unauthorized");

        const message = await ctx.db
            .query("messages")
            .filter((q) => q.eq(q.field("_id"), args.messageId))
            .unique();

        if (!message) throw new ConvexError("Message not found");

        await ctx.db.delete(args.messageId);
    },
});

export const clearOldMessages = mutation({
    args: {},
    handler: async (ctx) => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const batchSize = 500;

        while (true) {
            const oldBatch = await ctx.db
                .query("messages")
                .withIndex("by_creation_time", (q) => q.lt("_creationTime", cutoff))
                .take(batchSize);

            if (oldBatch.length === 0) {
                break;
            }

            const filesId = oldBatch
                .map((entry) => entry.storageId)
                .filter((id): id is Id<"_storage"> => Boolean(id));

            await Promise.allSettled(oldBatch.map((msg) => ctx.db.delete(msg._id)));
            await Promise.allSettled(filesId.map((fileId) => ctx.storage.delete(fileId)));

            if (oldBatch.length < batchSize) {
                break;
            }
        }
    },
});

// unoptimized

// export const getMessages = query({
// 	args:{
// 		conversation: v.id("conversations"),
// 	},
// 	handler: async (ctx, args) => {
// 		const identity = await ctx.auth.getUserIdentity();
// 		if (!identity) {
// 			throw new ConvexError("Not authenticated");
// 		}

// 		const messages = await ctx.db
// 		.query("messages")
// 		.withIndex("by_conversation", q=> q.eq("conversation", args.conversation))
// 		.collect();

// 		// john => 200 , 1
// 		const messagesWithSender = await Promise.all(
// 			messages.map(async (message) => {
// 				const sender = await ctx.db
// 				.query("users")
// 				.filter(q => q.eq(q.field("_id"), message.sender))
// 				.first();

// 				return {...message,sender}
// 			})
// 		)

// 		return messagesWithSender;
// 	}
// });
