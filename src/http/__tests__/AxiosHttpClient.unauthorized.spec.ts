import { describe, it, expect, vi } from 'vitest';
import { AxiosError } from 'axios';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { AxiosHttpClient } from '../AxiosHttpClient';

const reply = (config: InternalAxiosRequestConfig, status: number) => {
  const response = { data: { ok: status < 400 }, status, statusText: String(status), headers: {}, config };
  return status >= 400
    ? Promise.reject(new AxiosError('err', String(status), config, null, response))
    : Promise.resolve(response);
};

/** Sadece "new-token" ile gelen istekleri kabul eden sahte sunucu. */
const createServer = () => {
  const seenAuth: (string | undefined)[] = [];
  const adapter: AxiosAdapter = (config) => {
    const auth = config.headers?.get?.('Authorization') as string | undefined;
    seenAuth.push(auth);
    return reply(config, auth === 'Bearer new-token' ? 200 : 401);
  };
  return { adapter, seenAuth };
};

describe('AxiosHttpClient — unauthorized handler', () => {
  it('401 → handler true → yeni token ile bir kez tekrar dener', async () => {
    const { adapter, seenAuth } = createServer();
    let token = 'old-token';
    const client = new AxiosHttpClient({ adapter }, undefined, () => token);
    client.setUnauthorizedHandler(async () => { token = 'new-token'; return true; });

    const result = await client.get('/x');

    expect(result.isSuccess).toBe(true);
    expect(seenAuth).toEqual(['Bearer old-token', 'Bearer new-token']);
  });

  it('eşzamanlı 401lerde handler tek sefer çalışır', async () => {
    const { adapter } = createServer();
    let token = 'old-token';
    const handler = vi.fn(async () => { token = 'new-token'; return true; });
    const client = new AxiosHttpClient({ adapter }, undefined, () => token);
    client.setUnauthorizedHandler(handler);

    const results = await Promise.all([client.get('/a'), client.get('/b'), client.get('/c')]);

    expect(results.every((r) => r.isSuccess)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('handler false dönerse veya fırlatırsa Result.fail döner, sonsuz döngü olmaz', async () => {
    const { adapter, seenAuth } = createServer();
    const client = new AxiosHttpClient({ adapter }, undefined, () => 'old-token');
    client.setUnauthorizedHandler(async () => { throw new Error('refresh failed'); });

    const result = await client.get('/x');

    expect(result.isFailure).toBe(true);
    expect(seenAuth).toHaveLength(1);
  });

  it('handler yoksa davranış değişmez', async () => {
    const { adapter, seenAuth } = createServer();
    const client = new AxiosHttpClient({ adapter }, undefined, () => 'old-token');

    expect((await client.get('/x')).isFailure).toBe(true);
    expect(seenAuth).toHaveLength(1);
  });

  it('409 ConflictError mesajı ile döner', async () => {
    const adapter: AxiosAdapter = (config) => {
      const response = { data: { message: 'Mükerrer başvuru' }, status: 409, statusText: 'Conflict', headers: {}, config };
      return Promise.reject(new AxiosError('err', '409', config, null, response));
    };
    const client = new AxiosHttpClient({ adapter });
    const result = await client.get('/x');
    expect(result.error).toBe('Mükerrer başvuru');
  });
});