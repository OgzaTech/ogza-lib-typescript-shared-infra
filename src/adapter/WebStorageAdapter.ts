import { IStorageAdapter } from '@ogza/core';

export class WebStorageAdapter implements IStorageAdapter {
  constructor(private storage: Storage = localStorage) {} // Default localStorage

  get<T>(key: string): T | null {
    const item = this.storage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item) as T;
    } catch {
      return item as unknown as T; // JSON değilse string dön
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