import { ICookieAdapter, CookieOptions } from '@ogza/core';

export class WebCookieAdapter implements ICookieAdapter {
  
  get(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  set(name: string, value: string, options: CookieOptions = {}): void {
    if (typeof document === 'undefined') return;
    
    let expires = "";
    if (options.expires) {
      if (typeof options.expires === 'number') {
        const date = new Date();
        date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
      } else {
        expires = "; expires=" + options.expires.toUTCString();
      }
    }

    const path = options.path ? `; path=${options.path}` : '; path=/';
    const secure = options.secure ? '; secure' : '';
    
    document.cookie = `${name}=${value || ""}${expires}${path}${secure}`;
  }

  remove(name: string, options: CookieOptions = {}): void {
    this.set(name, '', { ...options, expires: -1 });
  }
}