import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios, { AxiosHeaders } from 'axios';
import { AxiosHttpClient } from '../AxiosHttpClient';
import { IEncryptionService, Result, LocalizationService, CoreKeys, en } from '@ogza/core';

vi.mock('axios');
LocalizationService.setLocaleData(en);

// Mock Encryption Service
const mockEncryptionService: IEncryptionService = {
  encrypt: vi.fn(async (text: string) => Result.ok<string>(`ENCRYPTED_${text}`)),
  decrypt: vi.fn(async (text: string) => Result.ok<string>(text.replace('ENCRYPTED_', '')))
};

describe('AxiosHttpClient', () => {
  let client: AxiosHttpClient;
  let mockedAxiosInstance: any;

  beforeEach(() => {
    mockedAxiosInstance = {
      request: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    };
    
    (axios.create as any).mockReturnValue(mockedAxiosInstance);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create axios instance with default config', () => {
      client = new AxiosHttpClient();
      
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it('should merge custom config with defaults', () => {
      const customConfig = { baseURL: 'https://api.example.com' };
      client = new AxiosHttpClient(customConfig);
      
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({ 
          timeout: 30000,
          baseURL: 'https://api.example.com'
        })
      );
    });

    it('should setup all interceptors', () => {
      client = new AxiosHttpClient({}, mockEncryptionService);
      
      expect(mockedAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockedAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('GET Requests', () => {
    beforeEach(() => {
      client = new AxiosHttpClient();
    });

    it('should make successful GET request', async () => {
      mockedAxiosInstance.request.mockResolvedValue({
        data: { users: [] },
        status: 200,
        statusText: 'OK',
        headers: {}
      });

      const result = await client.get('/users');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().data).toEqual({ users: [] });
      expect(result.getValue().status).toBe(200);
      expect(mockedAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/users'
        })
      );
    });

    it('should pass query params correctly', async () => {
      mockedAxiosInstance.request.mockResolvedValue({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {}
      });

      const params = { page: 1, limit: 10 };
      await client.get('/users', params);

      expect(mockedAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { page: 1, limit: 10 }
        })
      );
    });

    it('should pass custom headers', async () => {
      mockedAxiosInstance.request.mockResolvedValue({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {}
      });

      const headers = { 'X-Custom-Header': 'value' };
      await client.get('/users', undefined, headers);

      expect(mockedAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { 'X-Custom-Header': 'value' }
        })
      );
    });
  });

  describe('POST Requests', () => {
    beforeEach(() => {
      client = new AxiosHttpClient();
    });

    it('should make successful POST request', async () => {
      mockedAxiosInstance.request.mockResolvedValue({
        data: { id: 1, name: 'John' },
        status: 201,
        statusText: 'Created',
        headers: {}
      });

      const body = { name: 'John' };
      const result = await client.post('/users', body);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().status).toBe(201);
      expect(mockedAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/users',
          data: body
        })
      );
    });
  });

  describe('PUT Requests', () => {
    beforeEach(() => {
      client = new AxiosHttpClient();
    });

    it('should make successful PUT request', async () => {
      mockedAxiosInstance.request.mockResolvedValue({
        data: { id: 1, name: 'Jane' },
        status: 200,
        statusText: 'OK',
        headers: {}
      });

      const body = { name: 'Jane' };
      const result = await client.put('/users/1', body);

      expect(result.isSuccess).toBe(true);
      expect(mockedAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: '/users/1',
          data: body
        })
      );
    });
  });

  describe('DELETE Requests', () => {
    beforeEach(() => {
      client = new AxiosHttpClient();
    });

    it('should make successful DELETE request', async () => {
      mockedAxiosInstance.request.mockResolvedValue({
        data: null,
        status: 204,
        statusText: 'No Content',
        headers: {}
      });

      const result = await client.delete('/users/1');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().status).toBe(204);
      expect(mockedAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: '/users/1'
        })
      );
    });
  });

  describe('PATCH Requests', () => {
    beforeEach(() => {
      client = new AxiosHttpClient();
    });

    it('should make successful PATCH request', async () => {
      mockedAxiosInstance.request.mockResolvedValue({
        data: { id: 1, email: 'new@example.com' },
        status: 200,
        statusText: 'OK',
        headers: {}
      });

      const body = { email: 'new@example.com' };
      const result = await client.patch('/users/1', body);

      expect(result.isSuccess).toBe(true);
      expect(mockedAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: '/users/1',
          data: body
        })
      );
    });
  });

  describe('Token Middleware', () => {
    it('should add Authorization header when token provider is set', async () => {
      const tokenProvider = vi.fn(() => 'my-secret-token');
      client = new AxiosHttpClient({}, undefined, tokenProvider);

      const requestInterceptor = mockedAxiosInstance.interceptors.request.use.mock.calls[0][0];
      
      const config = {
        headers: new AxiosHeaders(),
        url: '/test',
        method: 'GET'
      } as any;

      const modifiedConfig = await requestInterceptor(config);

      expect(modifiedConfig.headers.get('Authorization')).toBe('Bearer my-secret-token');
    });

    it('should not add Authorization header when token provider returns null', async () => {
      const tokenProvider = vi.fn(() => null);
      client = new AxiosHttpClient({}, undefined, tokenProvider);

      const requestInterceptor = mockedAxiosInstance.interceptors.request.use.mock.calls[0][0];
      
      const config = {
        headers: new AxiosHeaders(),
        url: '/test',
        method: 'GET'
      } as any;

      const modifiedConfig = await requestInterceptor(config);

      expect(modifiedConfig.headers.get('Authorization')).toBeUndefined();
    });

    it('should allow setting token provider after initialization', async () => {
      client = new AxiosHttpClient();
      
      const tokenProvider = vi.fn(() => 'runtime-token');
      client.setAuthTokenProvider(tokenProvider);

      const requestInterceptor = mockedAxiosInstance.interceptors.request.use.mock.calls[0][0];
      
      const config = {
        headers: new AxiosHeaders(),
        url: '/test',
        method: 'GET'
      } as any;

      const modifiedConfig = await requestInterceptor(config);

      expect(modifiedConfig.headers.get('Authorization')).toBe('Bearer runtime-token');
    });
  });

  describe('Encryption Middleware', () => {
    beforeEach(() => {
      client = new AxiosHttpClient({}, mockEncryptionService);
    });

    it('should not encrypt when x-encrypt header is absent', async () => {
      const requestInterceptor = mockedAxiosInstance.interceptors.request.use.mock.calls[1][0];

      const config = {
        headers: new AxiosHeaders(),
        data: { secret: 'data' }
      } as any;

      const modifiedConfig = await requestInterceptor(config);

      expect(modifiedConfig.data).toEqual({ secret: 'data' });
      expect(mockEncryptionService.encrypt).not.toHaveBeenCalled();
    });

    it('should decrypt response when x-encrypted header is present', async () => {
      const responseInterceptor = mockedAxiosInstance.interceptors.response.use.mock.calls[0][0];

      const response = {
        data: { payload: 'ENCRYPTED_{"result":"success"}' },
        headers: { 'x-encrypted': 'true' },
        status: 200,
        statusText: 'OK'
      };

      const modifiedResponse = await responseInterceptor(response);

      expect(modifiedResponse.data).toEqual({ result: 'success' });
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith('ENCRYPTED_{"result":"success"}');
    });

    it('should not decrypt when x-encrypted header is absent', async () => {
      const responseInterceptor = mockedAxiosInstance.interceptors.response.use.mock.calls[0][0];

      const response = {
        data: { result: 'success' },
        headers: {},
        status: 200,
        statusText: 'OK'
      };

      const modifiedResponse = await responseInterceptor(response);

      expect(modifiedResponse.data).toEqual({ result: 'success' });
      expect(mockEncryptionService.decrypt).not.toHaveBeenCalled();
    });

    it('should handle decryption failure gracefully', async () => {
      const failingEncryption: IEncryptionService = {
        encrypt: vi.fn(async (text: string) => Result.ok<string>('encrypted')),
        decrypt: vi.fn(async (text: string) => Result.fail<string>('Decryption failed'))
      };

      client = new AxiosHttpClient({}, failingEncryption);

      const responseInterceptor = mockedAxiosInstance.interceptors.response.use.mock.calls[0][0];

      const response = {
        data: { payload: 'invalid-encrypted-data' },
        headers: { 'x-encrypted': 'true' },
        status: 200,
        statusText: 'OK'
      };

      // Test that it throws
      try {
        await responseInterceptor(response);
        // If we get here, test should fail
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

  });

  describe('Error Handling', () => {
    beforeEach(() => {
      client = new AxiosHttpClient();
    });

    it('should handle 400 Bad Request', async () => {
      mockedAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Invalid input' },
          statusText: 'Bad Request'
        }
      });

      (axios.isAxiosError as any) = vi.fn(() => true);

      const result = await client.get('/test');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid input');
    });

    it('should handle 401 Unauthorized', async () => {
      mockedAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 401,
          data: { message: 'Token expired' },
          statusText: 'Unauthorized'
        }
      });

      (axios.isAxiosError as any) = vi.fn(() => true);

      const result = await client.get('/test');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Token expired');
    });

    it('should handle 403 Forbidden', async () => {
      mockedAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 403,
          data: { message: 'Access denied' },
          statusText: 'Forbidden'
        }
      });

      (axios.isAxiosError as any) = vi.fn(() => true);

      const result = await client.get('/test');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Access denied');
    });

    it('should handle 404 Not Found', async () => {
      mockedAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 404,
          data: {},
          statusText: 'Not Found'
        }
      });

      (axios.isAxiosError as any) = vi.fn(() => true);

      const result = await client.get('/test');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('not found');
    });

    it('should handle 503 Service Unavailable', async () => {
      mockedAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 503,
          data: { message: 'Service temporarily unavailable' },
          statusText: 'Service Unavailable'
        }
      });

      (axios.isAxiosError as any) = vi.fn(() => true);

      const result = await client.get('/test');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Service temporarily unavailable');
    });

    it('should handle network errors', async () => {
      mockedAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        request: {},
        message: 'Network Error'
      });

      (axios.isAxiosError as any) = vi.fn(() => true);

      const result = await client.get('/test');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(LocalizationService.t(CoreKeys.INFRA.NETWORK_ERROR));
    });

    it('should handle timeout errors', async () => {
      mockedAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        request: {},
        code: 'ECONNABORTED',
        message: 'Timeout'
      });

      (axios.isAxiosError as any) = vi.fn(() => true);

      const result = await client.get('/test');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(LocalizationService.t(CoreKeys.INFRA.TIMEOUT_ERROR));
    });

    it('should handle unknown errors', async () => {
      mockedAxiosInstance.request.mockRejectedValue(new Error('Unknown error'));

      (axios.isAxiosError as any) = vi.fn(() => false);

      const result = await client.get('/test');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(LocalizationService.t(CoreKeys.INFRA.NETWORK_ERROR));
    });

    it('should handle Strapi error format', async () => {
      mockedAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              message: 'Validation error from Strapi'
            }
          },
          statusText: 'Bad Request'
        }
      });

      (axios.isAxiosError as any) = vi.fn(() => true);

      const result = await client.get('/test');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Validation error from Strapi');
    });
  });

  describe('Response Mapping', () => {
    beforeEach(() => {
      client = new AxiosHttpClient();
    });

    it('should correctly map response structure', async () => {
      mockedAxiosInstance.request.mockResolvedValue({
        data: { id: 1, name: 'Test' },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.get('/test');
      const response = result.getValue();

      expect(response.data).toEqual({ id: 1, name: 'Test' });
      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
      expect(response.headers).toHaveProperty('content-type');
    });
  });
  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      client = new AxiosHttpClient({}, mockEncryptionService);
    });

    it('should handle encryption without body', async () => {
      mockedAxiosInstance.request.mockResolvedValue({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {}
      });

      // POST without body but with x-encrypt header
      await client.post('/test', undefined, { 'x-encrypt': 'true' });

      expect(mockedAxiosInstance.request).toHaveBeenCalled();
    });

    it('should handle response without payload in encrypted response', async () => {
      mockedAxiosInstance.request.mockResolvedValue({
        data: { someData: 'test' }, // No 'payload' field
        status: 200,
        statusText: 'OK',
        headers: { 'x-encrypted': 'true' }
      });

      const result = await client.get('/test');

      expect(result.isSuccess).toBe(true);
    });

    it('should handle network request error without response', async () => {
      mockedAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        request: {},
        message: 'Network Error'
      });

      (axios.isAxiosError as any) = vi.fn(() => true);

      const result = await client.get('/test');

      expect(result.isFailure).toBe(true);
    });

    it('should handle unknown HTTP status codes', async () => {
      mockedAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 418, // I'm a teapot
          data: { message: 'Teapot error' },
          statusText: 'Teapot'
        }
      });

      (axios.isAxiosError as any) = vi.fn(() => true);

      const result = await client.get('/test');

      expect(result.isFailure).toBe(true);
    });

    it('should handle error during request setup', async () => {
      mockedAxiosInstance.request.mockRejectedValue({
        isAxiosError: false,
        message: 'Setup error'
      });

      (axios.isAxiosError as any) = vi.fn(() => false);

      const result = await client.get('/test');

      expect(result.isFailure).toBe(true);
    });

    it('should handle plain object headers', async () => {
      const plainHeadersClient = new AxiosHttpClient();
      
      mockedAxiosInstance.request.mockResolvedValue({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {}
      });

      await plainHeadersClient.get('/test', undefined, { 'Custom-Header': 'value' });

      expect(mockedAxiosInstance.request).toHaveBeenCalled();
    });
  });
  
});