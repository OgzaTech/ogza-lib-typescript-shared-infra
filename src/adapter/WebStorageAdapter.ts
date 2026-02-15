import { IStorageAdapter } from '@ogza/core';

/**
 * WebStorageAdapter - Browser localStorage/sessionStorage wrapper
 * 
 * @implements {IStorageAdapter}
 */
export class WebStorageAdapter implements IStorageAdapter {
  private storage: any;

  constructor(storage?: any) {
    // Browser ortamında localStorage kullan, yoksa boş obje
    if (typeof window !== 'undefined' && storage) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      this.storage = localStorage;
    } else {
      // Node.js ortamı için fallback
      this.storage = {
        data: {} as Record<string, string>,
        getItem(key: string) { return this.data[key] || null; },
        setItem(key: string, value: string) { this.data[key] = value; },
        removeItem(key: string) { delete this.data[key]; },
        clear() { this.data = {}; }
      };
    }
  }

  get<T>(key: string): T | null {
    const item = this.storage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item) as T;
    } catch {
      return item as unknown as T;
    }
  }

  set(key: string, value: any): void {
    if (typeof value === 'object') {
      this.storage.setItem(key, JSON.stringify(value));
    } else {
      this.storage.setItem(key, String(value));
    }
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }
}