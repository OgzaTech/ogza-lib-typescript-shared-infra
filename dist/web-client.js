"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/web-client.ts
var web_client_exports = {};
__export(web_client_exports, {
  AxiosHttpClient: () => AxiosHttpClient,
  WebCookieAdapter: () => WebCookieAdapter,
  WebStorageAdapter: () => WebStorageAdapter
});
module.exports = __toCommonJS(web_client_exports);

// src/http/AxiosHttpClient.ts
var import_axios = __toESM(require("axios"));
var import_core = require("@ogza/core");
var AxiosHttpClient = class {
  constructor(config, encryptionService, tokenProvider) {
    this.client = import_axios.default.create({
      timeout: 3e4,
      // Default 30s timeout
      ...config
    });
    this.encryptionService = encryptionService;
    this.tokenProvider = tokenProvider;
    this.initializeInterceptors();
  }
  /**
   * Token provider'ı runtime'da set etmek için
   * Özellikle login sonrası token güncellemelerinde kullanılır
   */
  setAuthTokenProvider(provider) {
    this.tokenProvider = provider;
  }
  /**
   * Tüm interceptor'ları sırayla başlat
   * Sıralama önemli: Token -> Encryption -> Response handling
   */
  initializeInterceptors() {
    this.addTokenMiddleware();
    this.addEncryptionMiddleware();
    this.addResponseMiddleware();
  }
  /**
   * REQUEST INTERCEPTOR 1: Token Injection
   * Her istekte otomatik olarak Authorization header'ı ekler
   */
  addTokenMiddleware() {
    this.client.interceptors.request.use((config) => {
      if (!this.tokenProvider) return config;
      const token = this.tokenProvider();
      if (token && config.headers) {
        this.setHeader(config.headers, "Authorization", `Bearer ${token}`);
      }
      return config;
    });
  }
  /**
   * REQUEST/RESPONSE INTERCEPTOR 2: Encryption
   * x-encrypt header'ı varsa request body'yi şifreler
   * x-encrypted header'ı varsa response'u deşifreler
   */
  addEncryptionMiddleware() {
    this.client.interceptors.request.use(async (config) => {
      if (!this.encryptionService || !config.headers) return config;
      const shouldEncrypt = this.getHeader(config.headers, "x-encrypt") === "true";
      if (shouldEncrypt) {
        this.deleteHeader(config.headers, "x-encrypt");
        if (config.data) {
          const stringBody = JSON.stringify(config.data);
          const encryptedResult = await this.encryptionService.encrypt(stringBody);
          if (encryptedResult.isFailure) {
            throw new Error(encryptedResult.error || import_core.LocalizationService.t(import_core.CoreKeys.INFRA.ENCRYPTION_FAILED));
          }
          config.data = { payload: encryptedResult.getValue() };
        }
      }
      return config;
    });
    this.client.interceptors.response.use(async (response) => {
      const isEncrypted = response.headers["x-encrypted"] === "true";
      if (this.encryptionService && isEncrypted && response.data?.payload) {
        const decryptedResult = await this.encryptionService.decrypt(response.data.payload);
        if (decryptedResult.isFailure) {
          throw new Error(decryptedResult.error || import_core.LocalizationService.t(import_core.CoreKeys.INFRA.DECRYPTION_FAILED));
        }
        try {
          response.data = JSON.parse(decryptedResult.getValue());
        } catch {
          response.data = decryptedResult.getValue();
        }
      }
      return response;
    });
  }
  /**
   * RESPONSE INTERCEPTOR 3: Error Handling
   * Hataları yakalayıp Promise.reject ile fırlatır
   * Asıl error mapping handleAxiosError'da yapılır
   */
  addResponseMiddleware() {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error)
    );
  }
  /**
   * Ana HTTP request metodu
   * Tüm HTTP metodları (GET, POST, PUT, DELETE) buradan geçer
   */
  async request(options) {
    try {
      const axiosConfig = {
        url: options.url,
        method: options.method,
        data: options.body,
        headers: options.headers,
        params: options.params,
        timeout: options.timeout
      };
      const response = await this.client.request(axiosConfig);
      return import_core.Result.ok(this.mapResponse(response));
    } catch (error) {
      return this.handleAxiosError(error);
    }
  }
  /**
   * Axios response'unu IHttpResponse'a map eder
   */
  mapResponse(response) {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    };
  }
  /**
   * Axios hatalarını domain error'larına çevirir
   * HTTP status code'lara göre uygun error türü döner
   */
  handleAxiosError(error) {
    if (!import_axios.default.isAxiosError(error)) {
      return import_core.Result.fail(import_core.LocalizationService.t(import_core.CoreKeys.INFRA.NETWORK_ERROR));
    }
    const axiosError = error;
    if (axiosError.response) {
      return this.handleResponseError(axiosError.response);
    }
    if (axiosError.request) {
      return this.handleRequestError(axiosError);
    }
    return import_core.Result.fail(import_core.LocalizationService.t(import_core.CoreKeys.INFRA.NETWORK_ERROR));
  }
  /**
   * HTTP response error'larını işler (4xx, 5xx)
   */
  handleResponseError(response) {
    const status = response.status;
    const data = response.data;
    const serverMessage = data?.error?.message || data?.message || response.statusText;
    switch (status) {
      case 400:
        return import_core.Result.fail(new import_core.ValidationError(serverMessage).message);
      case 401:
        return import_core.Result.fail(new import_core.UnauthorizedError(serverMessage).message);
      case 403:
        return import_core.Result.fail(new import_core.ForbiddenError(serverMessage).message);
      case 404:
        return import_core.Result.fail(new import_core.NotFoundError(serverMessage || "Resource").message);
      case 503:
        return import_core.Result.fail(new import_core.ServiceUnavailableError(serverMessage).message);
      default:
        return import_core.Result.fail(new import_core.UnexpectedError(serverMessage || `HTTP ${status}`).message);
    }
  }
  /**
   * Network error'larını işler (timeout, connection refused, vb.)
   */
  handleRequestError(error) {
    if (error.code === "ECONNABORTED") {
      return import_core.Result.fail(import_core.LocalizationService.t(import_core.CoreKeys.INFRA.TIMEOUT_ERROR));
    }
    return import_core.Result.fail(import_core.LocalizationService.t(import_core.CoreKeys.INFRA.NETWORK_ERROR));
  }
  /**
   * Type-safe header getter
   * AxiosHeaders class'ı veya plain object her ikisini de destekler
   */
  getHeader(headers, key) {
    if (headers instanceof import_axios.AxiosHeaders) {
      return headers.get(key);
    }
    return headers[key] || null;
  }
  /**
   * Type-safe header setter
   */
  setHeader(headers, key, value) {
    if (headers instanceof import_axios.AxiosHeaders) {
      headers.set(key, value);
    } else {
      headers[key] = value;
    }
  }
  /**
   * Type-safe header deleter
   */
  deleteHeader(headers, key) {
    if (headers instanceof import_axios.AxiosHeaders) {
      headers.delete(key);
    } else {
      delete headers[key];
    }
  }
  // ==================== CONVENIENCE METHODS ====================
  async get(url, params, headers) {
    return this.request({ url, method: "GET", params, headers });
  }
  async post(url, body, headers) {
    return this.request({ url, method: "POST", body, headers });
  }
  async put(url, body, headers) {
    return this.request({ url, method: "PUT", body, headers });
  }
  async delete(url, headers) {
    return this.request({ url, method: "DELETE", headers });
  }
  async patch(url, body, headers) {
    return this.request({ url, method: "PATCH", body, headers });
  }
};

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AxiosHttpClient,
  WebCookieAdapter,
  WebStorageAdapter
});
