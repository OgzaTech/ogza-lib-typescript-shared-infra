import {
  AxiosHttpClient
} from "./chunk-3QGC5NGI.mjs";

// src/adapter/WebCookieAdapter.ts
var WebCookieAdapter = class {
  get(name) {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  }
  set(name, value, options = {}) {
    if (typeof document === "undefined") return;
    let expires = "";
    if (options.expires) {
      if (typeof options.expires === "number") {
        const date = /* @__PURE__ */ new Date();
        date.setTime(date.getTime() + options.expires * 24 * 60 * 60 * 1e3);
        expires = "; expires=" + date.toUTCString();
      } else {
        expires = "; expires=" + options.expires.toUTCString();
      }
    }
    const path = options.path ? `; path=${options.path}` : "; path=/";
    const secure = options.secure ? "; secure" : "";
    document.cookie = `${name}=${value || ""}${expires}${path}${secure}`;
  }
  remove(name, options = {}) {
    this.set(name, "", { ...options, expires: -1 });
  }
};

// src/adapter/WebStorageAdapter.ts
var WebStorageAdapter = class {
  constructor(storage) {
    if (typeof window !== "undefined" && storage) {
      this.storage = storage;
    } else if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      this.storage = localStorage;
    } else {
      this.storage = {
        data: {},
        getItem(key) {
          return this.data[key] || null;
        },
        setItem(key, value) {
          this.data[key] = value;
        },
        removeItem(key) {
          delete this.data[key];
        },
        clear() {
          this.data = {};
        }
      };
    }
  }
  get(key) {
    const item = this.storage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  }
  set(key, value) {
    if (typeof value === "object") {
      this.storage.setItem(key, JSON.stringify(value));
    } else {
      this.storage.setItem(key, String(value));
    }
  }
  remove(key) {
    this.storage.removeItem(key);
  }
  clear() {
    this.storage.clear();
  }
};
export {
  AxiosHttpClient,
  WebCookieAdapter,
  WebStorageAdapter
};
