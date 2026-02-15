import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { AxiosHttpClient } from '../AxiosHttpClient';
import { IEncryptionService, Result,LocalizationService, CoreKeys, en } from '@ogza/core';

// Axios'u mockla
vi.mock('axios');
LocalizationService.setLocaleData(en);

// Mock Encryption Service
const mockEncryptionService: IEncryptionService = {
  encrypt: vi.fn(async (text) => Result.ok(`ENCRYPTED_${text}`)),
  decrypt: vi.fn(async (text) => Result.ok(text.replace('ENCRYPTED_', '')))
};

describe('AxiosHttpClient', () => {
  let client: AxiosHttpClient;
  // Mocklanan axios create fonksiyonunun dönüş değerini tutmak için
  let mockedAxiosInstance: any;

  beforeEach(() => {
    mockedAxiosInstance = {
      request: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    };
    
    // axios.create çağrıldığında bizim sahte instance'ı dönsün
    (axios.create as any).mockReturnValue(mockedAxiosInstance);

    client = new AxiosHttpClient({}, mockEncryptionService);
  });

  it('should create axios instance with interceptors', () => {
    expect(axios.create).toHaveBeenCalled();
    expect(mockedAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockedAxiosInstance.interceptors.response.use).toHaveBeenCalled();
  });

  it('should make a successful POST request', async () => {
    // Mock response
    mockedAxiosInstance.request.mockResolvedValue({
      data: { success: true },
      status: 200,
      statusText: 'OK',
      headers: {}
    });

    const result = await client.post('/test', { name: 'test' });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().data).toEqual({ success: true });
    expect(mockedAxiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      url: '/test'
    }));
  });

  it('should handle request failure', async () => {
    // Mock error
    mockedAxiosInstance.request.mockRejectedValue({
      message: 'Network Error'
    });

    const result = await client.get('/error');

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(LocalizationService.t(CoreKeys.INFRA.NETWORK_ERROR));
  });

  // ENCRYPTION TESTLERİ (Interceptor Logic)
  // Interceptor'ları test etmek için biraz "derin" mock manipülasyonu gerekir 
  // veya entegrasyon testi gibi düşünmek gerekir.
  // Burada mantığı doğrulamak için manuel tetikleme simülasyonu yapabiliriz.
  
  it('should encrypt data if x-encrypt header is present', async () => {
    // Interceptor handler fonksiyonunu alalım
    // request.use((config) => ...) çağrısındaki ilk argüman
    const requestInterceptor = mockedAxiosInstance.interceptors.request.use.mock.calls[0][1];

    const config = {
      headers: { 'x-encrypt': 'true' },
      data: { secret: 'data' }
    };

    // Interceptor'ı manuel çalıştır
    const modifiedConfig = await requestInterceptor(config);

    // Header silinmiş olmalı
    expect(modifiedConfig.headers['x-encrypt']).toBeUndefined();
    // Data şifrelenmiş olmalı (Mock servisimiz "ENCRYPTED_" ekliyordu)
    // JSON.stringify yapıldığı için string içinde arıyoruz
    expect(modifiedConfig.data.payload).toContain('ENCRYPTED_');
    expect(mockEncryptionService.encrypt).toHaveBeenCalled();
  });
});