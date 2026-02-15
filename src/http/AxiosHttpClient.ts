import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError, 
  InternalAxiosRequestConfig,
  AxiosHeaders 
} from 'axios';
import { 
  IHttpClient, 
  IHttpRequest, 
  IHttpResponse, 
  Result,
  IEncryptionService,
  LocalizationService,
  CoreKeys,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnexpectedError
} from '@ogza/core';

/**
 * AxiosHttpClient - HTTP işlemleri için Infrastructure implementasyonu
 * 
 * Sorumluluklar:
 * - HTTP isteklerini yönetme
 * - Otomatik token enjeksiyonu
 * - İsteğe bağlı şifreleme/şifre çözme
 * - Merkezi hata yönetimi
 * - Response interceptor'ları
 * 
 * @implements {IHttpClient}
 */
export class AxiosHttpClient implements IHttpClient {
  private readonly client: AxiosInstance;
  private encryptionService?: IEncryptionService;
  private tokenProvider?: () => string | null;

  constructor(
    config?: AxiosRequestConfig, 
    encryptionService?: IEncryptionService,
    tokenProvider?: () => string | null
  ) {
    this.client = axios.create({
      timeout: 30000, // Default 30s timeout
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
  public setAuthTokenProvider(provider: () => string | null): void {
    this.tokenProvider = provider;
  }

  /**
   * Tüm interceptor'ları sırayla başlat
   * Sıralama önemli: Token -> Encryption -> Response handling
   */
  private initializeInterceptors(): void {
    this.addTokenMiddleware();
    this.addEncryptionMiddleware();
    this.addResponseMiddleware();
  }

  /**
   * REQUEST INTERCEPTOR 1: Token Injection
   * Her istekte otomatik olarak Authorization header'ı ekler
   */
  private addTokenMiddleware(): void {
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (!this.tokenProvider) return config;

      const token = this.tokenProvider();
      
      if (token && config.headers) {
        this.setHeader(config.headers, 'Authorization', `Bearer ${token}`);
      }
      
      return config;
    });
  }

  /**
   * REQUEST/RESPONSE INTERCEPTOR 2: Encryption
   * x-encrypt header'ı varsa request body'yi şifreler
   * x-encrypted header'ı varsa response'u deşifreler
   */
  private addEncryptionMiddleware(): void {
    // Request Encryption
    this.client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      if (!this.encryptionService || !config.headers) return config;
      
      const shouldEncrypt = this.getHeader(config.headers, 'x-encrypt') === 'true';

      if (shouldEncrypt) {
        this.deleteHeader(config.headers, 'x-encrypt');

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

    // Response Decryption
    this.client.interceptors.response.use(async (response: AxiosResponse) => {
      const isEncrypted = response.headers['x-encrypted'] === 'true';
      
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
  private addResponseMiddleware(): void {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error)
    );
  }

  /**
   * Ana HTTP request metodu
   * Tüm HTTP metodları (GET, POST, PUT, DELETE) buradan geçer
   */
  public async request<T>(options: IHttpRequest): Promise<Result<IHttpResponse<T>>> {
    try {
      const axiosConfig: AxiosRequestConfig = {
        url: options.url,
        method: options.method,
        data: options.body,
        headers: options.headers,
        params: options.params,
        timeout: options.timeout,
      };

      const response: AxiosResponse<T> = await this.client.request(axiosConfig);

      return Result.ok<IHttpResponse<T>>(this.mapResponse(response));

    } catch (error: unknown) {
      return this.handleAxiosError<T>(error);
    }
  }

  /**
   * Axios response'unu IHttpResponse'a map eder
   */
  private mapResponse<T>(response: AxiosResponse<T>): IHttpResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string | string[]>
    };
  }

  /**
   * Axios hatalarını domain error'larına çevirir
   * HTTP status code'lara göre uygun error türü döner
   */
  private handleAxiosError<T>(error: unknown): Result<IHttpResponse<T>> {
    if (!axios.isAxiosError(error)) {
      return Result.fail(LocalizationService.t(CoreKeys.INFRA.NETWORK_ERROR));
    }

    const axiosError = error as AxiosError;

    // Response var (sunucu cevap verdi ama hata kodu döndü)
    if (axiosError.response) {
      return this.handleResponseError(axiosError.response);
    }

    // Request gönderildi ama cevap alınamadı
    if (axiosError.request) {
      return this.handleRequestError(axiosError);
    }

    // İstek oluşturulurken hata
    return Result.fail(LocalizationService.t(CoreKeys.INFRA.NETWORK_ERROR));
  }

  /**
   * HTTP response error'larını işler (4xx, 5xx)
   */
  private handleResponseError<T>(response: AxiosResponse): Result<IHttpResponse<T>> {
    const status = response.status;
    const data = response.data as any;
    const serverMessage = data?.error?.message || data?.message || response.statusText;

    switch (status) {
      case 400:
        return Result.fail(new ValidationError(serverMessage).message);
      case 401:
        return Result.fail(new UnauthorizedError(serverMessage).message);
      case 403:
        return Result.fail(new ForbiddenError(serverMessage).message);
      case 404:
        return Result.fail(new NotFoundError(serverMessage || 'Resource').message);
      case 503:
        return Result.fail(new ServiceUnavailableError(serverMessage).message);
      default:
        return Result.fail(new UnexpectedError(serverMessage || `HTTP ${status}`).message);
    }
  }

  /**
   * Network error'larını işler (timeout, connection refused, vb.)
   */
  private handleRequestError<T>(error: AxiosError): Result<IHttpResponse<T>> {
    if (error.code === 'ECONNABORTED') {
      return Result.fail(LocalizationService.t(CoreKeys.INFRA.TIMEOUT_ERROR));
    }
    return Result.fail(LocalizationService.t(CoreKeys.INFRA.NETWORK_ERROR));
  }

  /**
   * Type-safe header getter
   * AxiosHeaders class'ı veya plain object her ikisini de destekler
   */
  private getHeader(headers: AxiosHeaders | Record<string, any>, key: string): string | null {
    if (headers instanceof AxiosHeaders) {
      return headers.get(key) as string | null;
    }
    return headers[key] || null;
  }

  /**
   * Type-safe header setter
   */
  private setHeader(headers: AxiosHeaders | Record<string, any>, key: string, value: string): void {
    if (headers instanceof AxiosHeaders) {
      headers.set(key, value);
    } else {
      headers[key] = value;
    }
  }

  /**
   * Type-safe header deleter
   */
  private deleteHeader(headers: AxiosHeaders | Record<string, any>, key: string): void {
    if (headers instanceof AxiosHeaders) {
      headers.delete(key);
    } else {
      delete headers[key];
    }
  }

  // ==================== CONVENIENCE METHODS ====================

  public async get<T>(
    url: string, 
    params?: any, 
    headers?: Record<string, string>
  ): Promise<Result<IHttpResponse<T>>> {
    return this.request<T>({ url, method: 'GET', params, headers });
  }

  public async post<T>(
    url: string, 
    body: any, 
    headers?: Record<string, string>
  ): Promise<Result<IHttpResponse<T>>> {
    return this.request<T>({ url, method: 'POST', body, headers });
  }

  public async put<T>(
    url: string, 
    body: any, 
    headers?: Record<string, string>
  ): Promise<Result<IHttpResponse<T>>> {
    return this.request<T>({ url, method: 'PUT', body, headers });
  }

  public async delete<T>(
    url: string, 
    headers?: Record<string, string>
  ): Promise<Result<IHttpResponse<T>>> {
    return this.request<T>({ url, method: 'DELETE', headers });
  }

  public async patch<T>(
    url: string, 
    body: any, 
    headers?: Record<string, string>
  ): Promise<Result<IHttpResponse<T>>> {
    return this.request<T>({ url, method: 'PATCH', body, headers });
  }
}