import { ConvexError, v } from "convex/values";
import {
    internalMutation,
    internalQuery,
    mutation,
    MutationCtx,
} from "./_generated/server";

const subscriptionValidator = v.object({
    endpoint: v.string(),
    expirationTime: v.optional(v.number()),
    keys: v.object({
        p256dh: v.string(),
        auth: v.string(),
    }),
});

const getAuthenticatedUser = async (ctx: MutationCtx) => {
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
};

export const saveSubscription = mutation({
    args: {
        subscription: subscriptionValidator,
    },
    handler: async (ctx, args) => {
        const user = await getAuthenticatedUser(ctx);

        const existing = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_user_endpoint", (q) =>
                q.eq("userId", user._id).eq("subscription.endpoint", args.subscription.endpoint)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                subscription: args.subscription,
            });
            return existing._id;
        }

        return await ctx.db.insert("pushSubscriptions", {
            userId: user._id,
            subscription: args.subscription,
        });
    },
});

export const removeSubscription = mutation({
    args: {
        endpoint: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthenticatedUser(ctx);

        const record = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_user_endpoint", (q) =>
                q.eq("userId", user._id).eq("subscription.endpoint", args.endpoint)
            )
            .unique();

        if (record) {
            await ctx.db.delete(record._id);
        }
    },
});

export const subscriptionsByUser = internalQuery({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
    },
});

export const removeById = internalMutation({
    args: {
        subscriptionId: v.id("pushSubscriptions"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.subscriptionId);
    },
});
