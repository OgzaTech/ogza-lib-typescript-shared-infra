import { BcryptHashingService } from '../BcryptHashingService';
import { describe, it, expect } from 'vitest';

describe('BcryptHashingService', () => {
  const service = new BcryptHashingService();

  it('should hash and verify password', async () => {
    const password = 'myPassword123';
    
    const hashResult = await service.hash(password);
    expect(hashResult.isSuccess).toBe(true);
    const hash = hashResult.getValue();

    const matchResult = await service.compare(password, hash);
    expect(matchResult.getValue()).toBe(true);

    const failResult = await service.compare('wrong', hash);
    expect(failResult.getValue()).toBe(false);
  });

  it('should hash empty string', async () => {
    const result = await service.hash('');
    expect(result.isSuccess).toBe(true);
  });

  it('should hash long password', async () => {
    const longPassword = 'A'.repeat(1000);
    const result = await service.hash(longPassword);
    expect(result.isSuccess).toBe(true);
  });

  it('should handle special characters', async () => {
    const password = '!@#$%^&*()_+{}:"<>?';
    const hashResult = await service.hash(password);
    expect(hashResult.isSuccess).toBe(true);
    
    const matchResult = await service.compare(password, hashResult.getValue());
    expect(matchResult.getValue()).toBe(true);
  });
});