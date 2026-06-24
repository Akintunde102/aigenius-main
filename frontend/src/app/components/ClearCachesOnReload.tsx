"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const shouldClearOnReload =
    process.env.NEXT_PUBLIC_CLEAR_CACHE_ON_RELOAD === "true";

export default function ClearCachesOnReload() {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!shouldClearOnReload) return;

        // React Query cache
        try {
            queryClient.clear();
        } catch (error) {
            // ignore
        }

        // Local/session storage
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                window.localStorage.clear();
            }
        } catch (_) { }
        try {
            if (typeof window !== "undefined" && window.sessionStorage) {
                window.sessionStorage.clear();
            }
        } catch (_) { }

        // CacheStorage (if any)
        try {
            if (typeof window !== "undefined" && "caches" in window) {
                caches
                    .keys()
                    .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
                    .catch(() => void 0);
            }
        } catch (_) { }

        // Service workers (if any)
        try {
            if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
                navigator.serviceWorker
                    .getRegistrations()
                    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
                    .catch(() => void 0);
            }
        } catch (_) { }

        // IndexedDB databases used in this app
        try {
            if (typeof indexedDB !== "undefined") {
                // Custom key-value store
                indexedDB.deleteDatabase("KeyValueStore");
                // Records DB
                indexedDB.deleteDatabase("myDatabase");
                // Chat storage DB
                indexedDB.deleteDatabase("ChatStorageDB");
            }
        } catch (_) { }

        // Known misc flags
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                window.localStorage.removeItem("dbVersion");
            }
        } catch (_) { }
    }, [queryClient]);

    return null;
}




