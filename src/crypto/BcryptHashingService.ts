import * as bcrypt from 'bcrypt';
import { IHashingService, Result, LocalizationService, CoreKeys } from '@ogza/core';

/**
 * BcryptHashingService - Bcrypt kullanarak password hashing
 *
 * NFR-042 (Şifre Hash Güvenliği):
 *  - cost (saltRounds) = 12 (NFR-042 minimum)
 *  - bcrypt her hash için benzersiz salt üretir (otomatik)
 *  - Ham şifre HİÇBİR log/hata mesajında görünmez
 *  - bcrypt.compare sabit zamanlı karşılaştırma yapar
 *
 * @implements {IHashingService}
 */
export class BcryptHashingService implements IHashingService {
  // NFR-042: minimum cost 12
  private readonly saltRounds = 12;

  async hash(plainText: string): Promise<Result<string>> {
    try {
      const hashed = await bcrypt.hash(plainText, this.saltRounds);
      return Result.ok(hashed);
    } catch (err: any) {
      // NFR-042: ham şifre loglanmaz — sadece teknik hata mesajı
      const msg = LocalizationService.t(CoreKeys.INFRA.HASHING_FAILED);
      return Result.fail(`${msg}: ${err.message}`);
    }
  }

  async compare(plainText: string, hashedValue: string): Promise<Result<boolean>> {
    try {
      const match = await bcrypt.compare(plainText, hashedValue);
      return Result.ok(match);
    } catch (err: any) {
      // NFR-042: ham şifre/hash loglanmaz
      const msg = LocalizationService.t(CoreKeys.INFRA.HASHING_FAILED);
      return Result.fail(`${msg}: ${err.message}`);
    }
  }
}