import {ConvexError, v} from "convex/values";
import {mutation, query} from "./_generated/server";

export const upsertConversation = mutation({
	args: {
		_id: v.optional(v.id("conversations")),
		participants: v.array(v.id("users")),
		isGroup: v.boolean(),
		groupName: v.optional(v.string()),
		groupImage: v.optional(v.id("_storage")),
		admins: v.optional(v.array(v.id("users"))),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new ConvexError("Unauthorized");

	const normalizedParticipants = [...args.participants].sort((a, b) => a.localeCompare(b));

	let existingConversation = args._id ? await ctx.db.get(args._id) : null;

	if (!existingConversation) {
		existingConversation = await ctx.db
			.query("conversations")
			.filter((q) =>
				q.or(
					q.eq(q.field("participants"), normalizedParticipants),
					q.eq(q.field("participants"), args.participants)
				)
			)
			.first();
	}

		let groupImage;

		if (args.groupImage) {
			groupImage = (await ctx.storage.getUrl(args.groupImage)) as string;
		}

		if (existingConversation) {
		await ctx.db.patch(existingConversation._id, {
			groupName: args.groupName ?? existingConversation.groupName,
			isGroup: existingConversation.isGroup,
			groupImage: groupImage ?? existingConversation.groupImage,
			admins: args.admins ?? existingConversation.admins,
			participants: normalizedParticipants ?? existingConversation.participants,
		});

			return existingConversation._id;
		}

	return await ctx.db.insert("conversations", {
		participants: normalizedParticipants,
			isGroup: args.isGroup,
			groupName: args.groupName,
			groupImage,
			admins: args.admins,
		});
	},
});

export const addConversationParticipants = mutation({
	args: {
		_id: v.optional(v.id("conversations")),
		participants: v.array(v.id("users"))
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new ConvexError("Unauthorized");

		const conversation = await ctx.db
			.query("conversations")
			.filter((q) => q.eq(q.field("_id"), args._id))
			.unique();

		if (!conversation) throw new ConvexError("Conversation not found");

		await ctx.db.patch(conversation._id, {
			participants: args.participants,
		});

		return conversation._id;
	},
});

export const updateGroupInfo = mutation({
	args: {
		conversationId: v.id("conversations"),
		groupName: v.optional(v.string()),
		groupImageStorageId: v.optional(v.id("_storage")),
		removeImage: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new ConvexError("Unauthorized");

		const user = await ctx.db
			.query("users")
			.withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
			.unique();

		if (!user) throw new ConvexError("User not found");

		const conversation = await ctx.db.get(args.conversationId);
		if (!conversation || !conversation.isGroup) {
			throw new ConvexError("Group conversation not found");
		}

		const isAdmin = conversation.admins?.includes(user._id);
		if (!isAdmin) {
			throw new ConvexError("Only admins can update group info");
		}

		let groupImage = conversation.groupImage;

		if (args.removeImage) {
			groupImage = undefined;
		} else if (args.groupImageStorageId) {
			groupImage = (await ctx.storage.getUrl(args.groupImageStorageId)) ?? undefined;
		}

		await ctx.db.patch(args.conversationId, {
			groupName: args.groupName ?? conversation.groupName,
			groupImage,
		});

		return {
			groupName: args.groupName ?? conversation.groupName,
			groupImage,
		};
	},
});

export const updateAdmins = mutation({
	args: {
		conversationId: v.id("conversations"),
		admins: v.array(v.id("users")),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new ConvexError("Unauthorized");

		const conversation = await ctx.db.get(args.conversationId);
		if (!conversation) throw new ConvexError("Conversation not found");

		await ctx.db.patch(args.conversationId, {
			admins: args.admins,
		});
	},
});

export const getMyConversations = query({
	args: {},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new ConvexError("Unauthorized");

		const user = await ctx.db
			.query("users")
			.withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
			.unique();

		if (!user) throw new ConvexError("User not found");

		const conversations = await ctx.db.query("conversations").collect();

		const myConversations = conversations.filter((conversation) => {
			return conversation.participants.includes(user._id);
		});

		return await Promise.all(
			myConversations.map(async (conversation) => {
				let userDetails = {};

				if (!conversation.isGroup) {
					const otherUserId = conversation.participants.find((id) => id !== user._id);
					const userProfile = await ctx.db
						.query("users")
						.filter((q) => q.eq(q.field("_id"), otherUserId))
						.take(1);

					userDetails = userProfile[0];
				}

				const lastMessage = await ctx.db
					.query("messages")
					.filter((q) => q.eq(q.field("conversation"), conversation._id))
					.order("desc")
					.take(1);

				// return should be in this order, otherwise _id field will be overwritten
				return {
					...userDetails,
					...conversation,
					lastMessage: lastMessage[0] || null,
				};
			})
		);
	},
});

export const kickUser = mutation({
	args: {
		conversationId: v.id("conversations"),
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new ConvexError("Unauthorized");

		const conversation = await ctx.db
			.query("conversations")
			.filter((q) => q.eq(q.field("_id"), args.conversationId))
			.unique();

		if (!conversation) throw new ConvexError("Conversation not found");

		await ctx.db.patch(args.conversationId, {
			participants: conversation.participants.filter((id) => id !== args.userId),
		});
	},
});

export const deleteConversation = mutation({
	args: {
		conversationId: v.id("conversations")
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new ConvexError("Unauthorized");

		const conversation = await ctx.db
			.query("conversations")
			.filter((q) => q.eq(q.field("_id"), args.conversationId))
			.unique();

		if (!conversation) throw new ConvexError("Conversation not found");

		await ctx.db.delete(args.conversationId);
	},
});


export const generateUploadUrl = mutation(async (ctx) => {
	return await ctx.storage.generateUploadUrl();
});
