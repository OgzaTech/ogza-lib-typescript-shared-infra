import { NodeEncryptionService } from '../NodeEncryptionService';
import { describe, it, expect } from 'vitest';

describe('NodeEncryptionService (AES)', () => {
  const secretKey = 'super-secret-key';
  const service = new NodeEncryptionService(secretKey);

  it('should encrypt and decrypt correctly', async () => {
    const original = 'Hello World 123';
    
    // Şifrele
    const encryptResult = await service.encrypt(original);
    expect(encryptResult.isSuccess).toBe(true);
    const cipherText = encryptResult.getValue();
    
    // Şifreli metin orjinalden farklı olmalı ve IV içermeli (:)
    expect(cipherText).not.toBe(original);
    expect(cipherText).toContain(':');

    // Çöz
    const decryptResult = await service.decrypt(cipherText);
    expect(decryptResult.isSuccess).toBe(true);
    expect(decryptResult.getValue()).toBe(original);
  });

  it('should fail to decrypt tampered data', async () => {
    const original = 'Test';
    const encryptResult = await service.encrypt(original);
    const cipherText = encryptResult.getValue();
    
    // Veriyi boz (son karakteri değiştir)
    const tampered = cipherText.substring(0, cipherText.length - 1) + 'X';
    
    const decryptResult = await service.decrypt(tampered);
    expect(decryptResult.isFailure).toBe(true);
  });
});