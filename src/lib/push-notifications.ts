"use client";

export const urlBase64ToUint8Array = (base64String: string) => {
    const normalised = (base64String ?? "").trim().replace(/\s+/g, "");
    if (!normalised) {
        return new Uint8Array();
    }

    const padding = "=".repeat((4 - (normalised.length % 4)) % 4);
    const base64 = (normalised + padding).replace(/-/g, "+").replace(/_/g, "/");

    const atobFn =
        typeof window !== "undefined"
            ? window.atob.bind(window)
            : (globalThis as any).atob?.bind(globalThis);

    if (!atobFn) {
        throw new Error("Base64 decoding is not supported in this environment.");
    }

    let rawData = "";
    try {
        rawData = atobFn(base64);
    } catch (error) {
        console.error("Invalid base64 string for VAPID key.");
        throw error;
    }

    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
};
