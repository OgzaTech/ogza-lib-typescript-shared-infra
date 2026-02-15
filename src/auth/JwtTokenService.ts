import * as jwt from 'jsonwebtoken';
import { 
  ITokenService, 
  Result, 
  ITokenPayload,
  LocalizationService,
  CoreKeys
} from '@ogza/core';

/**
 * JwtTokenService - JWT token yönetimi
 * 
 * @implements {ITokenService}
 */
export class JwtTokenService implements ITokenService {
  private readonly secretKey: string;
  private readonly defaultExpiresIn: string | number;

  constructor(secretKey: string, defaultExpiresIn: string | number = '1h') {
    this.secretKey = secretKey;
    this.defaultExpiresIn = defaultExpiresIn;
  }

  async sign(payload: ITokenPayload, expiresIn?: string | number): Promise<Result<string>> {
    try {
      const plainPayload = JSON.parse(JSON.stringify(payload));
      
      const options: jwt.SignOptions = {
        expiresIn: (expiresIn || this.defaultExpiresIn) as jwt.SignOptions['expiresIn']
      };

      const token = jwt.sign(plainPayload, this.secretKey, options);
      
      return Result.ok(token);
    } catch (err: any) {
      return Result.fail(`Token signing failed: ${err.message}`);
    }
  }

  async verify(token: string): Promise<Result<ITokenPayload>> {
    try {
      const decoded = jwt.verify(token, this.secretKey) as unknown as ITokenPayload;
      return Result.ok(decoded);
    } catch (err: any) {
      return Result.fail(LocalizationService.t(CoreKeys.ERRORS.UNAUTHORIZED));
    }
  }

  decode(token: string): Result<ITokenPayload | null> {
    try {
      const decoded = jwt.decode(token) as unknown as ITokenPayload;
      return Result.ok(decoded);
    } catch (err: any) {
      return Result.fail(`Token decoding failed: ${err.message}`);
    }
  }
}