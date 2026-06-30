import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import {
  ITokenService,
  Result,
  ITokenPayload,
  LocalizationService,
  CoreKeys,
} from '@ogza/core';

/**
 * Rs256TokenService — FR-023 (JWT Local Doğrulama, RS256 asimetrik)
 *
 * HS256 (simetrik secret) yerine RS256 (asimetrik private/public key) kullanır.
 * Uygulamalar public key (JWKS) ile token'ı PLATFORMA GİTMEDEN local doğrular (BR-A10).
 *
 * Anahtarlar dışarıdan verilir (key yönetimi backend'de SigningKey tablosunda):
 *  - privateKeyPem: PEM (PKCS8) — sadece imzalama (backend)
 *  - publicKeyPem:  PEM (SPKI)  — doğrulama + JWKS
 *  - kid:           token header'ında taşınır; rotation için
 *  - issuer:        iss claim (platform veya tenant-scoped)
 *
 * Çoklu public key ile doğrulama (rotation geçişi) için verifyWithKeys kullanılır.
 */
export class Rs256TokenService implements ITokenService {
  constructor(
    private readonly privateKeyPem: string,
    private readonly publicKeyPem: string,
    private readonly kid: string,
    private readonly issuer: string = 'mkys',
    private readonly defaultExpiresIn: string | number = '15m',
  ) {}

  async sign(payload: ITokenPayload, expiresIn?: string | number): Promise<Result<string>> {
    try {
      const plainPayload = JSON.parse(JSON.stringify(payload));

      const options: jwt.SignOptions = {
        algorithm: 'RS256',
        expiresIn: (expiresIn || this.defaultExpiresIn) as jwt.SignOptions['expiresIn'],
        issuer:    this.issuer,
        keyid:     this.kid,   // header.kid → JWKS eşleştirmesi
      };

      const token = jwt.sign(plainPayload, this.privateKeyPem, options);
      return Result.ok(token);
    } catch (err: any) {
      return Result.fail(`Token signing failed: ${err.message}`);
    }
  }

  async verify(token: string): Promise<Result<ITokenPayload>> {
    try {
      const decoded = jwt.verify(token, this.publicKeyPem, {
        algorithms: ['RS256'],
        issuer:     this.issuer,
      }) as unknown as ITokenPayload;
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

  /**
   * JWKS için: PEM public key → JWK (RSA, n/e). kid + alg ile.
   */
  static publicKeyToJwk(publicKeyPem: string, kid: string): Record<string, string> {
    const keyObject = crypto.createPublicKey(publicKeyPem);
    const jwk = keyObject.export({ format: 'jwk' }) as crypto.JsonWebKey;
    return {
      kty: jwk.kty as string,
      n:   jwk.n as string,
      e:   jwk.e as string,
      kid,
      use: 'sig',
      alg: 'RS256',
    };
  }

  /**
   * RS256 anahtar çifti üret (PEM PKCS8 private + SPKI public).
   * SigningKey seed/rotation'da kullanılır.
   */
  static generateKeyPair(): { privateKeyPem: string; publicKeyPem: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding:  { type: 'spki',  format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { privateKeyPem: privateKey as string, publicKeyPem: publicKey as string };
  }
}