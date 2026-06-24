import { openChatDatabase } from './chatStorage';

let chatStorageInitFailureLogged = false;

// Initialize chat storage system
export async function initializeChatStorage(): Promise<void> {
    try {
        // This will create the database and object stores if they don't exist
        await openChatDatabase();

    } catch (error) {
        if (!chatStorageInitFailureLogged) {
            chatStorageInitFailureLogged = true;
            console.error('Failed to initialize chat storage:', error);
        }
        // Don't throw - we can still use the app without chat storage
    }
}

// Check if IndexedDB is available
export function isIndexedDBAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
}

// Fallback to localStorage if IndexedDB is not available
export function getStorageFallback(): 'indexeddb' | 'localstorage' {
    if (isIndexedDBAvailable()) {
        return 'indexeddb';
    }
    return 'localstorage';
}
