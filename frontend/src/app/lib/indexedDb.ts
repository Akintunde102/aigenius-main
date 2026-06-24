
export const INDEXED_DB_KEY_PATH = "recordSpaceAlias";

let dbInstance: any = null;

export function openDatabase(): Promise<IDBDatabase> {

    return new Promise((resolve, reject) => {

        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const currentVersion = Number(localStorage.getItem('dbVersion')) || 1;

        const request: IDBOpenDBRequest = indexedDB.open('myDatabase', currentVersion);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;


            if (!db.objectStoreNames.contains("records-by-recordspace")) {
                const objectStore = db.createObjectStore("records-by-recordspace", { keyPath: "recordId", autoIncrement: true });

                objectStore.createIndex(INDEXED_DB_KEY_PATH, "id", { unique: false });
            }
        };

        request.onsuccess = (event: Event) => {
            dbInstance = (event.target as IDBOpenDBRequest).result;
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event: Event) => {
            reject(request.error);
        };

        request.onblocked = (event: Event) => {
            dbInstance.close()
        };
    });
}
