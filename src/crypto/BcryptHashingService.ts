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
    console.log("BcryptHashingService Compare Method")
    try {
      console.log(plainText)
      console.log(hashedValue)

      const match = await bcrypt.compare(plainText, hashedValue);
      console.log("BcryptHashingService Compare Method - Match %s" , match)

      return Result.ok(match);
    } catch (err: any) {
      const msg = LocalizationService.t(CoreKeys.INFRA.HASHING_FAILED);
      console.log(`${msg}: ${err.message}`)
      return Result.fail(`${msg}: ${err.message}`);
    }
  }
}