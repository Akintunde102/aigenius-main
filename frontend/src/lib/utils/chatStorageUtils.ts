import { getAllChatResources as dbGetAllChatResources } from '@/lib/calls/model-chat-conversation';
import {
    storeSavedChats,
    storeSavedFullChats,
    storeChatHistory,
    storePinnedChats,
    clearChatStorage
} from './chatStorage';

// Utility to manually populate IndexedDB with backend data
export async function populateIndexedDBFromBackend(): Promise<void> {
    try {
        // Clear existing data
        await clearChatStorage();

        // Fetch all data from backend
        const backendData = await dbGetAllChatResources();

        // Store in IndexedDB
        await Promise.all([
            storeSavedChats(backendData.savedChats || []),
            storeSavedFullChats(backendData.savedFullChats || []),
            storeChatHistory(backendData.chatHistory || []),
            storePinnedChats(backendData.pinnedChats || [])
        ]);
    } catch (error) {
        throw error;
    }
}

// Utility to check IndexedDB contents
export async function checkIndexedDBContents(): Promise<void> {
    try {
        const { getAllChatResources } = await import('./modelChatConversationUtils');
        const data = await getAllChatResources();
    } catch (error) {
        // Silently handle errors
    }
}

// Utility to force refresh from backend
export async function forceRefreshFromBackend(): Promise<void> {
    try {
        // Clear IndexedDB
        await clearChatStorage();

        // Populate from backend
        await populateIndexedDBFromBackend();
    } catch (error) {
        // Silently handle errors
    }
}

// Test backend call directly
export async function testBackendCall(): Promise<void> {
    try {
        // Import the backend function directly
        const backendModule = await import('@/lib/calls/model-chat-conversation');
        await backendModule.getAllChatResources();
    } catch (error) {
        // Silently handle errors
    }
}

// Make functions available globally for browser console access
if (typeof window !== 'undefined') {
    (window as any).populateIndexedDBFromBackend = populateIndexedDBFromBackend;
    (window as any).checkIndexedDBContents = checkIndexedDBContents;
    (window as any).forceRefreshFromBackend = forceRefreshFromBackend;
    (window as any).testBackendCall = testBackendCall;

    console.log('🔧 Chat storage utility functions available globally:');
    console.log('   - populateIndexedDBFromBackend()');
    console.log('   - checkIndexedDBContents()');
    console.log('   - forceRefreshFromBackend()');
    console.log('   - testBackendCall()');
    console.log('   - runAllChatStorageTests()');
}
