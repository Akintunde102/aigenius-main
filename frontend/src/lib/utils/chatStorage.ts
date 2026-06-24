import { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';

// IndexedDB configuration for chat storage
const CHAT_DB_NAME = 'ChatStorageDB';
const CHAT_DB_VERSION = 3;
const STORES = {
    SAVED_CHATS: 'savedChats',
    SAVED_FULL_CHATS: 'savedFullChats',
    CHAT_HISTORY: 'chatHistory',
    PINNED_CHATS: 'pinnedChats',
    LAST_SYNC: 'lastSync'
} as const;

let chatDbInstance: IDBDatabase | null = null;

// Open IndexedDB for chat storage
export async function openChatDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (chatDbInstance) {
            resolve(chatDbInstance);
            return;
        }

        const request = indexedDB.open(CHAT_DB_NAME, CHAT_DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create object stores for each chat type
            if (!db.objectStoreNames.contains(STORES.SAVED_CHATS)) {
                db.createObjectStore(STORES.SAVED_CHATS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.SAVED_FULL_CHATS)) {
                db.createObjectStore(STORES.SAVED_FULL_CHATS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.CHAT_HISTORY)) {
                db.createObjectStore(STORES.CHAT_HISTORY, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.PINNED_CHATS)) {
                db.createObjectStore(STORES.PINNED_CHATS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.LAST_SYNC)) {
                db.createObjectStore(STORES.LAST_SYNC, { keyPath: 'type' });
            }
        };

        request.onsuccess = (event: Event) => {
            chatDbInstance = (event.target as IDBOpenDBRequest).result;
            resolve(chatDbInstance);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Generic storage operations
async function storeData<T>(storeName: string, data: T[]): Promise<void> {
    const db = await openChatDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    // Clear existing data
    await new Promise<void>((resolve, reject) => {
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add new data
    for (const item of data) {
        await new Promise<void>((resolve, reject) => {
            const addRequest = store.add(item);
            addRequest.onsuccess = () => resolve();
            addRequest.onerror = () => reject(addRequest.error);
        });
    }
}

async function getData<T>(storeName: string): Promise<T[]> {
    try {

        const db = await openChatDatabase();
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {

                resolve(request.result);
            };
            request.onerror = () => {
                console.error(`❌ getData(${storeName}): Error:`, request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error(`❌ getData(${storeName}): Failed to open database:`, error);
        return []; // Return empty array on error
    }
}

async function updateLastSync(type: string): Promise<void> {
    try {
        const timestamp = Date.now();


        const db = await openChatDatabase();
        const transaction = db.transaction(STORES.LAST_SYNC, 'readwrite');
        const store = transaction.objectStore(STORES.LAST_SYNC);

        await new Promise<void>((resolve, reject) => {
            const request = store.put({ type, timestamp });
            request.onsuccess = () => {

                resolve();
            };
            request.onerror = () => {
                console.error(`❌ updateLastSync(${type}): Error:`, request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error(`❌ updateLastSync(${type}): Failed to open database:`, error);
    }
}

async function getLastSync(type: string): Promise<number | null> {
    try {

        const db = await openChatDatabase();
        const transaction = db.transaction(STORES.LAST_SYNC, 'readonly');
        const store = transaction.objectStore(STORES.LAST_SYNC);

        return new Promise((resolve, reject) => {
            const request = store.get(type);
            request.onsuccess = () => {
                const result = request.result?.timestamp || null;

                resolve(result);
            };
            request.onerror = () => {
                console.error(`❌ getLastSync(${type}): Error:`, request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error(`❌ getLastSync(${type}): Failed to open database:`, error);
        return null;
    }
}

// Chat-specific storage operations
export async function storeSavedChats(chats: ChatMessage[]): Promise<void> {
    await storeData(STORES.SAVED_CHATS, chats);
    await updateLastSync('savedChats');
}

export async function getSavedChats(): Promise<ChatMessage[]> {
    return await getData<ChatMessage>(STORES.SAVED_CHATS);
}

export async function storeSavedFullChats(chats: ChatSession[]): Promise<void> {
    await storeData(STORES.SAVED_FULL_CHATS, chats);
    await updateLastSync('savedFullChats');
}

export async function getSavedFullChats(): Promise<ChatSession[]> {
    return await getData<ChatSession>(STORES.SAVED_FULL_CHATS);
}

export async function storeChatHistory(history: ChatSession[]): Promise<void> {
    await storeData(STORES.CHAT_HISTORY, history);
    await updateLastSync('chatHistory');
}

export async function getChatHistory(): Promise<ChatSession[]> {
    return await getData<ChatSession>(STORES.CHAT_HISTORY);
}

export async function storePinnedChats(chats: ChatSession[]): Promise<void> {
    await storeData(STORES.PINNED_CHATS, chats);
    await updateLastSync('pinnedChats');
}

export async function getPinnedChats(): Promise<ChatSession[]> {
    return await getData<ChatSession>(STORES.PINNED_CHATS);
}

// Check if data needs sync (older than 30 minutes for better performance)
export async function needsSync(type: string): Promise<boolean> {
    try {
        const lastSync = await getLastSync(type);


        if (!lastSync) {

            return true;
        }

        const thirtyMinutes = 30 * 60 * 1000; // Increased from 5 minutes to 30 minutes
        const needsSyncResult = Date.now() - lastSync > thirtyMinutes;


        return needsSyncResult;
    } catch (error) {
        console.error(`❌ needsSync(${type}): Error checking sync:`, error);
        return true; // Default to needs sync on error
    }
}

// Clear all chat data
export async function clearChatStorage(): Promise<void> {
    const db = await openChatDatabase();
    const transaction = db.transaction(Object.values(STORES), 'readwrite');

    await Promise.all(
        Object.values(STORES).map(storeName =>
            new Promise<void>((resolve, reject) => {
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            })
        )
    );
}
