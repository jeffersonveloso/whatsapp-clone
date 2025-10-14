import {ConvexError, v} from "convex/values";
import {mutation, query} from "./_generated/server";
import {api} from "./_generated/api";
import {Id} from "./_generated/dataModel";
import {SystemIndexes} from "convex/server";

export const sendTextMessage = mutation({
    args: {
        sender: v.string(),
        content: v.string(),
        conversation: v.id("conversations"),
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

        await ctx.db.insert("messages", {
            sender: args.sender,
            content: args.content,
            conversation: args.conversation,
            messageType: "text",
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
        messageType: v.union(v.literal("text"), v.literal("image")),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("messages", {
            content: args.content,
            sender: "ChatGPT",
            messageType: args.messageType,
            conversation: args.conversation,
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

        const userProfileCache = new Map();

        return await Promise.all(
            messages.map(async (message) => {
                if (message.sender === "ChatGPT") {
                    const image = message.messageType === "text" ? "/gpt.png" : "dall-e.png";
                    return {...message, sender: {name: "ChatGPT", image}};
                }
                let sender;
                // Check if sender profile is in cache
                if (userProfileCache.has(message.sender)) {
                    sender = userProfileCache.get(message.sender);
                } else {
                    // Fetch sender profile from the database
                    sender = await ctx.db
                        .query("users")
                        .filter((q) => q.eq(q.field("_id"), message.sender))
                        .first();
                    // Cache the sender profile
                    userProfileCache.set(message.sender, sender);
                }

                return {...message, sender};
            })
        );
    },
});

export const sendImage = mutation({
    args: {imgId: v.id("_storage"), sender: v.id("users"), conversation: v.id("conversations")},
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Unauthorized");
        }

        const content = (await ctx.storage.getUrl(args.imgId)) as string;

        await ctx.db.insert("messages", {
            content: content,
            sender: args.sender,
            messageType: "image",
            conversation: args.conversation,
        });
    },
});

export const sendVideo = mutation({
    args: {videoId: v.id("_storage"), sender: v.id("users"), conversation: v.id("conversations")},
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Unauthorized");
        }

        const content = (await ctx.storage.getUrl(args.videoId)) as string;

        await ctx.db.insert("messages", {
            content: content,
            sender: args.sender,
            messageType: "video",
            conversation: args.conversation,
        });
    },
});

export const sendAudio = mutation({
    args: {audioId: v.id("_storage"), sender: v.id("users"), conversation: v.id("conversations")},
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Unauthorized");
        }

        const content = (await ctx.storage.getUrl(args.audioId)) as string;

        await ctx.db.insert("messages", {
            content: content,
            sender: args.sender,
            messageType: "audio",
            conversation: args.conversation,
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

        let storageId: Id<"_storage"> | null;
        switch (message.messageType) {
            case "text":
                storageId = null;
                break;
            default:
                storageId = message.content.substring(message.content.lastIndexOf("/") + 1) as  Id<"_storage">;
                break;
        }

        if(storageId) {
            await ctx.storage.delete(storageId);
        }

        await ctx.db.patch(args.messageId, {
            messageType: "text",
            content: "This message was deleted"
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

            const filesId: (Id<"_storage"> | undefined)[] = oldBatch.map((entry) => {
                switch (entry.messageType) {
                    case "text":
                        return;
                    default:
                        return entry.content.substring(entry.content.lastIndexOf("/") + 1) as  Id<"_storage">;
                }
            }).filter(Boolean);

            await Promise.allSettled(oldBatch.map((msg) => ctx.db.delete(msg._id)));
            await Promise.allSettled(filesId.map((fileId) => ctx.storage.delete(fileId as Id<"_storage">)));

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
