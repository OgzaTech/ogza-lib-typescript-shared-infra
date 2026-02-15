import * as crypto from 'crypto';
import { IEncryptionService, Result, LocalizationService, CoreKeys } from '@ogza/core';

/**
 * NodeEncryptionService - AES-256-CBC şifreleme servisi
 * 
 * @implements {IEncryptionService}
 */
export class NodeEncryptionService implements IEncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly ivLength = 16;

  constructor(secretKey: string) {
    this.key = crypto.createHash('sha256').update(String(secretKey)).digest();
  }

  async encrypt(plainText: string): Promise<Result<string>> {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return Result.ok(`${iv.toString('hex')}:${encrypted}`);
    } catch (err: any) {
      const msg = LocalizationService.t(CoreKeys.INFRA.ENCRYPTION_FAILED);
      return Result.fail(`${msg}: ${err.message}`);
    }
  }

  async decrypt(cipherText: string): Promise<Result<string>> {
    try {
      const textParts = cipherText.split(':');
      if (textParts.length !== 2) {
         return Result.fail(LocalizationService.t(CoreKeys.INFRA.INVALID_CIPHER_FORMAT));
      }

      const iv = Buffer.from(textParts[0], 'hex');
      const encryptedText = Buffer.from(textParts[1], 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return Result.ok(decrypted.toString());
    } catch (err: any) {
      const msg = LocalizationService.t(CoreKeys.INFRA.DECRYPTION_FAILED);
      return Result.fail(`${msg}: ${err.message}`);
    }
  }
}