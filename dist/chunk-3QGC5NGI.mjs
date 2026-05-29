// src/http/AxiosHttpClient.ts
import axios, {
  AxiosHeaders
} from "axios";
import {
  Result,
  LocalizationService,
  CoreKeys,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnexpectedError
} from "@ogza/core";
var AxiosHttpClient = class {
  constructor(config, encryptionService, tokenProvider) {
    this.client = axios.create({
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
            throw new Error(encryptedResult.error || LocalizationService.t(CoreKeys.INFRA.ENCRYPTION_FAILED));
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
          throw new Error(decryptedResult.error || LocalizationService.t(CoreKeys.INFRA.DECRYPTION_FAILED));
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
      return Result.ok(this.mapResponse(response));
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
    if (!axios.isAxiosError(error)) {
      return Result.fail(LocalizationService.t(CoreKeys.INFRA.NETWORK_ERROR));
    }
    const axiosError = error;
    if (axiosError.response) {
      return this.handleResponseError(axiosError.response);
    }
    if (axiosError.request) {
      return this.handleRequestError(axiosError);
    }
    return Result.fail(LocalizationService.t(CoreKeys.INFRA.NETWORK_ERROR));
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
        return Result.fail(new ValidationError(serverMessage).message);
      case 401:
        return Result.fail(new UnauthorizedError(serverMessage).message);
      case 403:
        return Result.fail(new ForbiddenError(serverMessage).message);
      case 404:
        return Result.fail(new NotFoundError(serverMessage || "Resource").message);
      case 503:
        return Result.fail(new ServiceUnavailableError(serverMessage).message);
      default:
        return Result.fail(new UnexpectedError(serverMessage || `HTTP ${status}`).message);
    }
  }
  /**
   * Network error'larını işler (timeout, connection refused, vb.)
   */
  handleRequestError(error) {
    if (error.code === "ECONNABORTED") {
      return Result.fail(LocalizationService.t(CoreKeys.INFRA.TIMEOUT_ERROR));
    }
    return Result.fail(LocalizationService.t(CoreKeys.INFRA.NETWORK_ERROR));
  }
  /**
   * Type-safe header getter
   * AxiosHeaders class'ı veya plain object her ikisini de destekler
   */
  getHeader(headers, key) {
    if (headers instanceof AxiosHeaders) {
      return headers.get(key);
    }
    return headers[key] || null;
  }
  /**
   * Type-safe header setter
   */
  setHeader(headers, key, value) {
    if (headers instanceof AxiosHeaders) {
      headers.set(key, value);
    } else {
      headers[key] = value;
    }
  }
  /**
   * Type-safe header deleter
   */
  deleteHeader(headers, key) {
    if (headers instanceof AxiosHeaders) {
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

export {
  AxiosHttpClient
};
