/**
 * Storage backend for chunks
 * Supports IndexedDB for browser-based persistence
 */
export class ChunkStorage {
  private dbName = 'bim-chunks';
  private storeName = 'chunks';
  private db?: IDBDatabase;

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    this.db = await this.openDB();
  }

  /**
   * Load a chunk from storage
   */
  async loadChunk(chunkId: string): Promise<Uint8Array> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(chunkId);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          resolve(new Uint8Array(result.data));
        } else {
          reject(new Error(`Chunk ${chunkId} not found`));
        }
      };

      request.onerror = () => {
        reject(new Error(`Failed to load chunk ${chunkId}: ${request.error}`));
      };
    });
  }

  /**
   * Save a chunk to storage
   */
  async saveChunk(chunkId: string, data: Uint8Array): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.put({
        id: chunkId,
        data: data.buffer,
        timestamp: Date.now(),
        size: data.length
      });

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to save chunk ${chunkId}: ${request.error}`));
      };
    });
  }

  /**
   * Delete a chunk
   */
  async deleteChunk(chunkId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(chunkId);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to delete chunk ${chunkId}: ${request.error}`));
      };
    });
  }

  /**
   * Check if chunk exists
   */
  async hasChunk(chunkId: string): Promise<boolean> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count(chunkId);

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all chunk IDs
   */
  async getAllChunkIds(): Promise<string[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    chunkCount: number;
    totalSize: number;
    oldestChunk: number;
  }> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const chunks = request.result;
        let totalSize = 0;
        let oldestTimestamp = Date.now();

        for (const chunk of chunks) {
          totalSize += chunk.size || 0;
          if (chunk.timestamp < oldestTimestamp) {
            oldestTimestamp = chunk.timestamp;
          }
        }

        resolve({
          chunkCount: chunks.length,
          totalSize,
          oldestChunk: oldestTimestamp
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all chunks
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
      };
    });
  }
}