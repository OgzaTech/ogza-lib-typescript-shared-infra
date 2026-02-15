import { NodeEncryptionService } from '../NodeEncryptionService';
import { describe, it, expect } from 'vitest';

describe('NodeEncryptionService (AES)', () => {
  const secretKey = 'super-secret-key';
  const service = new NodeEncryptionService(secretKey);

  it('should encrypt and decrypt correctly', async () => {
    const original = 'Hello World 123';
    
    const encryptResult = await service.encrypt(original);
    expect(encryptResult.isSuccess).toBe(true);
    const cipherText = encryptResult.getValue();
    
    expect(cipherText).not.toBe(original);
    expect(cipherText).toContain(':');

    const decryptResult = await service.decrypt(cipherText);
    expect(decryptResult.isSuccess).toBe(true);
    expect(decryptResult.getValue()).toBe(original);
  });

  it('should fail to decrypt tampered data', async () => {
    const original = 'Test';
    const encryptResult = await service.encrypt(original);
    const cipherText = encryptResult.getValue();
    
    const tampered = cipherText.substring(0, cipherText.length - 1) + 'X';
    
    const decryptResult = await service.decrypt(tampered);
    expect(decryptResult.isFailure).toBe(true);
  });

  it('should fail for invalid cipher format', async () => {
    const result = await service.decrypt('invalid-format');
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Invalid');
  });

  it('should handle empty string encryption', async () => {
    const result = await service.encrypt('');
    expect(result.isSuccess).toBe(true);
    
    const decryptResult = await service.decrypt(result.getValue());
    expect(decryptResult.isSuccess).toBe(true);
    expect(decryptResult.getValue()).toBe('');
  });

  it('should handle long text encryption', async () => {
    const longText = 'A'.repeat(10000);
    const encryptResult = await service.encrypt(longText);
    expect(encryptResult.isSuccess).toBe(true);
    
    const decryptResult = await service.decrypt(encryptResult.getValue());
    expect(decryptResult.isSuccess).toBe(true);
    expect(decryptResult.getValue()).toBe(longText);
  });
});