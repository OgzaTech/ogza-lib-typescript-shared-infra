import { BcryptHashingService } from '../BcryptHashingService';
import { describe, it, expect } from 'vitest';

describe('BcryptHashingService', () => {
  const service = new BcryptHashingService();

  it('should hash and verify password', async () => {
    const password = 'myPassword123';
    
    // Hash
    const hashResult = await service.hash(password);
    expect(hashResult.isSuccess).toBe(true);
    const hash = hashResult.getValue();

    // Verify Correct
    const matchResult = await service.compare(password, hash);
    expect(matchResult.getValue()).toBe(true);

    // Verify Wrong
    const failResult = await service.compare('wrong', hash);
    expect(failResult.getValue()).toBe(false);
  });
});