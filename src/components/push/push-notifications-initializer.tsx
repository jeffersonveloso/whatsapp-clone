"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { urlBase64ToUint8Array } from "@/lib/push-notifications";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";

const PushNotificationsInitializer = () => {
    const { isLoaded, isSignedIn } = useAuth();
    const saveSubscription = useMutation(api.pushSubscriptions.saveSubscription);
    const removeSubscription = useMutation(api.pushSubscriptions.removeSubscription);
    const hasInitialised = useRef(false);

    useEffect(() => {
        if (!isLoaded) return;
        if (typeof window === "undefined") return;
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") {
            return;
        }

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
            if (isSignedIn && !hasInitialised.current) {
                console.warn("Push notifications disabled: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.");
            }
            return;
        }

        let cancelled = false;

        const persistSubscription = async (subscription: PushSubscription) => {
            const json = subscription.toJSON();
            await saveSubscription({
                subscription: {
                    endpoint: json.endpoint,
                    expirationTime: json.expirationTime ?? undefined,
                    keys: {
                        auth: json.keys?.auth ?? "",
                        p256dh: json.keys?.p256dh ?? "",
                    },
                },
            });
        };

        const registerAndSubscribe = async () => {
            try {
                const registration = await navigator.serviceWorker.register("/sw.js");

                if (!hasInitialised.current) {
                    hasInitialised.current = true;
                }

                const permission =
                    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();

                if (permission !== "granted") {
                    const existing = await registration.pushManager.getSubscription();
                    if (existing) {
                        await removeSubscription({ endpoint: existing.endpoint });
                        await existing.unsubscribe();
                    }
                    return;
                }

                const existingSubscription = await registration.pushManager.getSubscription();
                const applicationServerKey = urlBase64ToUint8Array(vapidKey);

                const subscription =
                    existingSubscription ??
                    (await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey,
                    }));

                if (!subscription || cancelled) {
                    return;
                }

                await persistSubscription(subscription);
            } catch (error) {
                console.error("Failed to initialise push notifications", error);
            }
        };

        const cleanupSubscription = async () => {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                const subscription = await registration?.pushManager.getSubscription();

                if (!subscription) {
                    return;
                }

                await removeSubscription({ endpoint: subscription.endpoint });
                await subscription.unsubscribe();
            } catch (error) {
                console.error("Failed to remove push subscription", error);
            }
        };

        if (isSignedIn) {
            registerAndSubscribe();
        } else if (hasInitialised.current) {
            cleanupSubscription();
        }

        return () => {
            cancelled = true;
        };
    }, [isLoaded, isSignedIn, removeSubscription, saveSubscription]);

    return null;
};

export default PushNotificationsInitializer;
