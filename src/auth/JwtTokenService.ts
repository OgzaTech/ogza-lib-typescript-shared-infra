import * as jwt from 'jsonwebtoken';
import { 
  ITokenService, 
  Result, 
  ITokenPayload,
  LocalizationService,
  CoreKeys
} from '@ogza/core';

export class JwtTokenService implements ITokenService {
  private readonly secretKey: string;
  private readonly defaultExpiresIn: string | number;

  constructor(secretKey: string, defaultExpiresIn: string | number = '1h') {
    this.secretKey = secretKey;
    this.defaultExpiresIn = defaultExpiresIn;
  }

  // Token Üretme (Sign)
  async sign(payload: ITokenPayload, expiresIn?: string | number): Promise<Result<string>> {
    try {
      // payload nesnesini düz objeye çevir (class instance gelirse diye)
      const plainPayload = JSON.parse(JSON.stringify(payload));
      
      // HATA DÜZELTİLDİ:
      // expiresIn değerini jwt.SignOptions['expiresIn'] tipine cast ediyoruz.
      // Bu, TypeScript'e "Bu string veya number değerine güven" demektir.
      const options: jwt.SignOptions = {
        expiresIn: (expiresIn || this.defaultExpiresIn) as jwt.SignOptions['expiresIn']
      };

      const token = jwt.sign(plainPayload, this.secretKey, options);
      
      return Result.ok(token);
    } catch (err: any) {
      return Result.fail(`Token signing failed: ${err.message}`);
    }
  }

  // Token Doğrulama (Verify)
  async verify(token: string): Promise<Result<ITokenPayload>> {
    try {
      // verify metodu varsayılan olarak string | JwtPayload döner.
      // Biz ITokenPayload olduğunu biliyoruz.
      const decoded = jwt.verify(token, this.secretKey) as unknown as ITokenPayload;
      return Result.ok(decoded);
    } catch (err: any) {
      // Token süresi dolmuş veya geçersiz
      return Result.fail(LocalizationService.t(CoreKeys.ERRORS.UNAUTHORIZED));
    }
  }

  // Token Okuma (Decode - İmza kontrolü yapmaz!)
  decode(token: string): Result<ITokenPayload | null> {
    try {
      const decoded = jwt.decode(token) as unknown as ITokenPayload;
      return Result.ok(decoded);
    } catch (err: any) {
      return Result.fail(`Token decoding failed: ${err.message}`);
    }
  }
}