import * as bcrypt from 'bcrypt';
import { IHashingService, Result, LocalizationService, CoreKeys } from '@ogza/core';

/**
 * BcryptHashingService - Bcrypt kullanarak password hashing
 * 
 * @implements {IHashingService}
 */
export class BcryptHashingService implements IHashingService {
  private readonly saltRounds = 10;

  async hash(plainText: string): Promise<Result<string>> {
    try {
      const hashed = await bcrypt.hash(plainText, this.saltRounds);
      return Result.ok(hashed);
    } catch (err: any) {
      const msg = LocalizationService.t(CoreKeys.INFRA.HASHING_FAILED);
      return Result.fail(`${msg}: ${err.message}`);
    }
  }

  async compare(plainText: string, hashedValue: string): Promise<Result<boolean>> {
    try {
      const match = await bcrypt.compare(plainText, hashedValue);
      return Result.ok(match);
    } catch (err: any) {
      const msg = LocalizationService.t(CoreKeys.INFRA.HASHING_FAILED);
      return Result.fail(`${msg}: ${err.message}`);
    }
  }
}