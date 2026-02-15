import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
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

export class AxiosHttpClient implements IHttpClient {
  private client: AxiosInstance;
  private encryptionService?: IEncryptionService;
  private tokenProvider?: () => string | null;

  constructor(
    config?: AxiosRequestConfig, 
    encryptionService?: IEncryptionService,
    tokenProvider?: () => string | null
  ) {
    this.client = axios.create(config);
    this.encryptionService = encryptionService;
    this.tokenProvider = tokenProvider;
    
    // Modüler Kurulum
    this.initializeInterceptors();
  }

  // DIŞARIDAN TOKEN PROVIDER SET ETMEK İÇİN
  public setAuthTokenProvider(provider: () => string | null) {
    this.tokenProvider = provider;
  }

  // TÜM INTERCEPTORLARI BAŞLATAN YÖNETİCİ
  private initializeInterceptors() {
    this.addTokenMiddleware();      // 1. Token Ekle
    this.addEncryptionMiddleware(); // 2. Şifrele (Varsa)
    this.addResponseMiddleware();   // 3. Cevabı İşle ve Hata Yönetimi
  }

  // ----------------------------------------------------------------
  // 1. TOKEN MIDDLEWARE (Sadece Header Ekler)
  // ----------------------------------------------------------------
  private addTokenMiddleware() {
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (!this.tokenProvider) return config;

      const token = this.tokenProvider();
      
      if (token) {
        // Axios v1.x uyumlu Header Ekleme
        if (!config.headers) {
          config.headers = {} as any;
        }

        const headers = config.headers as any;

        // 'set' metodu varsa (AxiosHeaders class) onu kullan, yoksa direkt ata
        if (typeof headers.set === 'function') {
          headers.set('Authorization', `Bearer ${token}`);
        } else {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      return config;
    });
  }

  // ----------------------------------------------------------------
  // 2. ENCRYPTION MIDDLEWARE (Sadece Şifreleme Yapar)
  // ----------------------------------------------------------------
  private addEncryptionMiddleware() {
    // Request (Şifrele)
    this.client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      // Şifreleme servisi yoksa veya header'da istenmemişse geç
      if (!this.encryptionService) return config;
      
      // AxiosHeaders kontrolü (get/delete veya array access)
      const headers = config.headers as any;
      const encryptHeader = headers['x-encrypt'] || (typeof headers.get === 'function' ? headers.get('x-encrypt') : null);

      if (encryptHeader === 'true') {
        // Header'ı temizle
        if (typeof headers.delete === 'function') headers.delete('x-encrypt');
        else delete headers['x-encrypt'];

        // Body'yi şifrele
        if (config.data) {
          const stringBody = JSON.stringify(config.data);
          const encryptedResult = await this.encryptionService.encrypt(stringBody);
          
          if (encryptedResult.isSuccess) {
            config.data = { payload: encryptedResult.getValue() };
          } else {
            throw new Error(LocalizationService.t(CoreKeys.INFRA.ENCRYPTION_FAILED));
          }
        }
      }
      return config;
    });

    // Response (Şifreyi Çöz)
    this.client.interceptors.response.use(async (response) => {
      const isEncrypted = response.headers['x-encrypted'] === 'true';
      
      if (this.encryptionService && isEncrypted && response.data?.payload) {
          const decryptedResult = await this.encryptionService.decrypt(response.data.payload);
          
          if (decryptedResult.isSuccess) {
            try {
               response.data = JSON.parse(decryptedResult.getValue());
            } catch {
               response.data = decryptedResult.getValue();
            }
          } else {
             throw new Error(LocalizationService.t(CoreKeys.INFRA.DECRYPTION_FAILED));
          }
      }
      return response;
    });
  }

  // ----------------------------------------------------------------
  // 3. RESPONSE & ERROR MIDDLEWARE
  // ----------------------------------------------------------------
  private addResponseMiddleware() {
    this.client.interceptors.response.use(
      (response) => response, // Başarılı cevapları olduğu gibi geçir
      (error) => Promise.reject(error) // Hataları fırlat (handleAxiosError yakalayacak)
    );
  }

  // ----------------------------------------------------------------
  // PUBLIC REQUEST METHOD
  // ----------------------------------------------------------------
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

      const httpResponse: IHttpResponse<T> = {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as unknown as Record<string, string | string[]>
      };

      return Result.ok<IHttpResponse<T>>(httpResponse);

    } catch (error: any) {
      return this.handleAxiosError<T>(error);
    }
  }

  private handleAxiosError<T>(error: any): Result<IHttpResponse<T>> {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const status = axiosError.response.status;
        // Strapi hata formatı: error.message veya message
        const data = axiosError.response.data as any;
        const serverMessage = data?.error?.message || data?.message || axiosError.message; 

        switch (status) {
          case 400: return Result.fail(new ValidationError(serverMessage).message);
          case 401: return Result.fail(new UnauthorizedError(serverMessage).message);
          case 403: return Result.fail(new ForbiddenError(serverMessage).message);
          case 404: return Result.fail(new NotFoundError(serverMessage || 'Resource').message);
          case 503: return Result.fail(new ServiceUnavailableError(serverMessage).message);
          default:  return Result.fail(new UnexpectedError(serverMessage || `HTTP ${status}`).message);
        }
      } 
      else if (axiosError.request) {
        if (axiosError.code === 'ECONNABORTED') return Result.fail(LocalizationService.t(CoreKeys.INFRA.TIMEOUT_ERROR));
        return Result.fail(LocalizationService.t(CoreKeys.INFRA.NETWORK_ERROR));
      }
    }
    return Result.fail(LocalizationService.t(CoreKeys.INFRA.NETWORK_ERROR));
  }

  // Helpers
  public async get<T>(url: string, params?: any, headers?: any): Promise<Result<IHttpResponse<T>>> { return this.request<T>({ url, method: 'GET', params, headers }); }
  public async post<T>(url: string, body: any, headers?: any): Promise<Result<IHttpResponse<T>>> { return this.request<T>({ url, method: 'POST', body, headers }); }
  public async put<T>(url: string, body: any, headers?: any): Promise<Result<IHttpResponse<T>>> { return this.request<T>({ url, method: 'PUT', body, headers }); }
  public async delete<T>(url: string, headers?: any): Promise<Result<IHttpResponse<T>>> { return this.request<T>({ url, method: 'DELETE', headers }); }
}