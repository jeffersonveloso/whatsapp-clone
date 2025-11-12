import {ConvexError, v} from "convex/values";
import {internalMutation, query} from "./_generated/server";
import {paginationOptsValidator} from "convex/server";
import {UserRole} from "../types/roles";
import {Id} from "./_generated/dataModel";

export const createUser = internalMutation({
	args: {
		tokenIdentifier: v.string(),
		email: v.optional(v.string()),
		name: v.string(),
		image: v.string(),
	role: v.optional(
		v.union(
			v.literal(UserRole.common),
			v.literal(UserRole.admin),
			v.literal(UserRole.superAdmin),
			v.null(),
		),
	)
	},
	handler: async (ctx, args) => {
		await ctx.db.insert("users", {
			tokenIdentifier: args.tokenIdentifier,
			email: args.email ?? "",
			name: args.name,
			image: args.image,
			isOnline: true,
			role: args.role ? args.role : UserRole.common
		});
	},
});

export const updateUser = internalMutation({
	args: {
		tokenIdentifier: v.string(),
		image: v.string(),
		name: v.string(),
		role: v.optional(
		v.union(
			v.literal(UserRole.common),
			v.literal(UserRole.admin),
			v.literal(UserRole.superAdmin),
			v.null(),
		),
		)
	},
	async handler(ctx, args) {
		const user = await ctx.db
			.query("users")
			.withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
			.unique();

		if (!user) {
			throw new ConvexError("User not found");
		}

		await ctx.db.patch(user._id, {
			image: args.image,
			name: args.name,
			role: args.role ? args.role : user.role
		});
	},
});

export const deleteUser = internalMutation({
	args: {
		tokenIdentifier: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
			.unique();

		if (!user) {
			throw new ConvexError("User not found");
		}

		await ctx.db.delete(user._id);
	},
});

export const setUserOnline = internalMutation({
	args: { tokenIdentifier: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
			.unique();

		if (!user) {
			throw new ConvexError("User not found");
		}

		await ctx.db.patch(user._id, { isOnline: true });
	},
});

export const setUserOffline = internalMutation({
	args: { tokenIdentifier: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
			.unique();

		if (!user) {
			throw new ConvexError("User not found");
		}

		await ctx.db.patch(user._id, { isOnline: false });
	},
});

export const getUsers = query({
	args: {},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError("Unauthorized");
		}

		const users = await ctx.db.query("users").collect();
		return users.filter((user) => user.tokenIdentifier !== identity.tokenIdentifier);
	},
});


export const pagedUsers = query({
	args: {
		search:  v.optional(v.string()),
		conversationId: v.optional(v.id("conversations")),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, { search, conversationId, paginationOpts }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError("Unauthorized");
		}

		let participantsToExclude: Id<"users">[] = [];
		if (conversationId) {
			const conversation = await ctx.db.get(conversationId);
			if (!conversation) {
				throw new ConvexError("Conversation not found");
			}
			participantsToExclude = conversation.participants;
		}

		const excludeMe = (q: any) =>
			q.neq(q.field("tokenIdentifier"), identity.tokenIdentifier);

		const applyExclusions = (queryBuilder: any) => {
			let filteredQuery = queryBuilder.filter(excludeMe);

			if (participantsToExclude.length) {
				for (const participantId of participantsToExclude) {
					filteredQuery = filteredQuery.filter((q: any) =>
						q.neq(q.field("_id"), participantId),
					);
				}
			}

			return filteredQuery;
		};

		if (search && search.trim() !== "") {
			const searchParam = `"${search.trim()}"`;

			return await applyExclusions(
				ctx.db
				.query("users")
					.withSearchIndex("userSearchName", (b) => b.search("name", searchParam)), // full-text pelo índice name
			).paginate(paginationOpts);
		}

		return await applyExclusions(ctx.db.query("users"))
			//.withIndex("by_name")
			//.order("asc")
			.paginate(paginationOpts);
	},
});

export const getMe = query({
	args: {},
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

		return user;
	},
});

export const getGroupMembers = query({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new ConvexError("Unauthorized");
		}

		const conversation = await ctx.db
			.query("conversations")
			.filter((q) => q.eq(q.field("_id"), args.conversationId))
			.first();
		if (!conversation) {
			throw new ConvexError("Conversation not found");
		}

		const users = await ctx.db.query("users").collect();
		return users.filter((user) => conversation.participants.includes(user._id));
	},
});
