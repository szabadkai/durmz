// IndexedDB storage for patterns

import { Pattern } from '../types/pattern';

const DB_NAME = 'crossbeat-db';
const DB_VERSION = 1;
const STORE_NAME = 'patterns';

class PatternStorage {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create patterns store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('created', 'created', { unique: false });
          objectStore.createIndex('name', 'name', { unique: false });
          console.log('Created patterns object store');
        }
      };
    });
  }

  /**
   * Save a pattern
   */
  async savePattern(pattern: Pattern): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(pattern);

      request.onsuccess = () => {
        console.log('Pattern saved:', pattern.name);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to save pattern:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Load a pattern by ID
   */
  async loadPattern(id: string): Promise<Pattern | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Failed to load pattern:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all patterns
   */
  async getAllPatterns(): Promise<Pattern[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const patterns = request.result || [];
        // Sort by created date, newest first
        patterns.sort((a, b) => b.created - a.created);
        resolve(patterns);
      };

      request.onerror = () => {
        console.error('Failed to get patterns:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a pattern
   */
  async deletePattern(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Pattern deleted:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete pattern:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all patterns
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All patterns cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear patterns:', request.error);
        reject(request.error);
      };
    });
  }
}

// Global storage instance
export const patternStorage = new PatternStorage();
