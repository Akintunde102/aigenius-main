const DB_NAME = 'KeyValueStore';
const STORE_NAME = 'KeyValuePairs';
let dbInstance: IDBDatabase | null = null;

const turnLoggerOn = false;

const logger = {
    log: (message: string) => { /* intentionally empty */ },
    error: (message: string) => { /* intentionally empty */ },
}

export function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
                logger.log('Object store created');
            }
        };

        request.onsuccess = (event: Event) => {
            dbInstance = (event.target as IDBOpenDBRequest).result;
            logger.log('Database opened successfully');
            resolve(dbInstance);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export function setItem(key: string, value: Record<string, any>): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.put(JSON.parse(JSON.stringify(value)), key);

        request.onsuccess = () => {
            logger.log(`Key "${key}" set successfully`);
            resolve();
        };

        request.onerror = () => {
            logger.error(`Failed to set key "${key}"`);
            reject(request.error);
        };
    });
}

export function getItem<T>(key: string): Promise<T | null> {
    return new Promise(async (resolve, reject) => {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.get(key);

        request.onsuccess = (event: Event) => {
            const result = (event.target as IDBRequest).result;
            if (result !== undefined) {
                logger.log(`Value for key "${key}" retrieved successfully`);
                resolve(result);
            } else {
                logger.log(`No value found for key "${key}"`);
                resolve(null);
            }
        };

        request.onerror = () => {
            logger.error(`Failed to get key "${key}"`);
            reject(request.error);
        };
    });
}

export function removeItem(key: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.delete(key);

        request.onsuccess = () => {
            logger.log(`Key "${key}" removed successfully`);
            resolve();
        };

        request.onerror = () => {
            logger.error(`Failed to remove key "${key}"`);
            reject(request.error);
        };
    });
}

export function clearStore(): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.clear();

        request.onsuccess = () => {
            logger.log('Store cleared successfully');
            resolve();
        };

        request.onerror = () => {
            logger.error('Failed to clear the store');
            reject(request.error);
        };
    });
}
