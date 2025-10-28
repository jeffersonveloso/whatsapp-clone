"use node";

import webpush from "web-push";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

const getVapidKeys = () => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        console.warn("Push notifications skipped: missing VAPID keys");
        return null;
    }

    return { publicKey, privateKey };
};

export const sendToUser = internalAction({
    args: {
        userId: v.id("users"),
        payload: v.object({
            title: v.string(),
            body: v.string(),
            icon: v.optional(v.string()),
            badge: v.optional(v.string()),
            data: v.optional(v.any()),
        }),
    },
    handler: async (ctx, args) => {
        const vapidKeys = getVapidKeys();
        if (!vapidKeys) {
            return;
        }

        webpush.setVapidDetails(
            process.env.WEB_PUSH_CONTACT ?? "mailto:notifications@localhost",
            vapidKeys.publicKey,
            vapidKeys.privateKey,
        );

        const subscriptions = await ctx.runQuery(internal.pushSubscriptions.subscriptionsByUser, {
            userId: args.userId,
        });

        if (!subscriptions.length) {
            return;
        }

        const payloadString = JSON.stringify({
            title: args.payload.title,
            body: args.payload.body,
            icon: args.payload.icon,
            badge: args.payload.badge,
            data: args.payload.data,
        });

        await Promise.allSettled(
            subscriptions.map(async (entry: Doc<"pushSubscriptions">) => {
                try {
                    await webpush.sendNotification(entry.subscription as any, payloadString);
                } catch (error: any) {
                    const status = error?.statusCode;
                    if (status === 410 || status === 404) {
                        await ctx.runMutation(internal.pushSubscriptions.removeById, {
                            subscriptionId: entry._id,
                        });
                        return;
                    }

                    console.error("Failed to deliver push notification", error);
                }
            }),
        );
    },
});
