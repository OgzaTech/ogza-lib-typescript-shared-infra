import { AxiosRequestConfig } from 'axios';
import { IHttpClient, IEncryptionService, IHttpRequest, Result, IHttpResponse } from '@ogza/core';

declare class AxiosHttpClient implements IHttpClient {
    private readonly client;
    private encryptionService?;
    private tokenProvider?;
    constructor(config?: AxiosRequestConfig, encryptionService?: IEncryptionService, tokenProvider?: () => string | null);
    setAuthTokenProvider(provider: () => string | null): void;
    private initializeInterceptors;
    private addTokenMiddleware;
    private addEncryptionMiddleware;
    private addResponseMiddleware;
    request<T>(options: IHttpRequest): Promise<Result<IHttpResponse<T>>>;
    private mapResponse;
    private handleAxiosError;
    private handleResponseError;
    private handleRequestError;
    private getHeader;
    private setHeader;
    private deleteHeader;
    get<T>(url: string, params?: any, headers?: Record<string, string>): Promise<Result<IHttpResponse<T>>>;
    post<T>(url: string, body: any, headers?: Record<string, string>): Promise<Result<IHttpResponse<T>>>;
    put<T>(url: string, body: any, headers?: Record<string, string>): Promise<Result<IHttpResponse<T>>>;
    delete<T>(url: string, headers?: Record<string, string>): Promise<Result<IHttpResponse<T>>>;
    patch<T>(url: string, body: any, headers?: Record<string, string>): Promise<Result<IHttpResponse<T>>>;
}

export { AxiosHttpClient as A };
