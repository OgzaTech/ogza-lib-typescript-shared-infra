export { A as AxiosHttpClient } from './AxiosHttpClient-D7UXpHsu.js';
import { ICookieAdapter, CookieOptions, IStorageAdapter } from '@ogza/core';
import 'axios';

declare class WebCookieAdapter implements ICookieAdapter {
    get(name: string): string | null;
    set(name: string, value: string, options?: CookieOptions): void;
    remove(name: string, options?: CookieOptions): void;
}

declare class WebStorageAdapter implements IStorageAdapter {
    private storage;
    constructor(storage?: any);
    get<T>(key: string): T | null;
    set(key: string, value: any): void;
    remove(key: string): void;
    clear(): void;
}

export { WebCookieAdapter, WebStorageAdapter };
