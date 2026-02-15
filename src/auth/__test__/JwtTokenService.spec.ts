import { describe, it, expect, beforeEach } from 'vitest';
import { JwtTokenService } from '../JwtTokenService';
import type { ITokenPayload } from '@ogza/core';
import * as jwt from 'jsonwebtoken';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  const secretKey = 'test-secret-key-12345';
  const defaultExpiresIn = '1h';

  beforeEach(() => {
    service = new JwtTokenService(secretKey, defaultExpiresIn);
  });

  describe('Initialization', () => {
    it('should create instance with secret key', () => {
      expect(service).toBeDefined();
    });

    it('should use default expiresIn when not provided', () => {
      const defaultService = new JwtTokenService(secretKey);
      expect(defaultService).toBeDefined();
    });

    it('should accept custom expiresIn', () => {
      const customService = new JwtTokenService(secretKey, '2h');
      expect(customService).toBeDefined();
    });
  });

  describe('sign()', () => {
    it('should sign payload successfully', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com',
        roles: ['user']
      };

      const result = await service.sign(payload);

      expect(result.isSuccess).toBe(true);
      expect(typeof result.getValue()).toBe('string');
      expect(result.getValue().split('.')).toHaveLength(3);
    });

    it('should use default expiresIn when not specified', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com'
      };

      const result = await service.sign(payload);

      expect(result.isSuccess).toBe(true);
      
      const decoded = jwt.decode(result.getValue()) as any;
      expect(decoded.exp).toBeDefined();
    });

    it('should use custom expiresIn when provided', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com'
      };

      const result = await service.sign(payload, '30m');

      expect(result.isSuccess).toBe(true);
    });

    it('should accept numeric expiresIn', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com'
      };

      const result = await service.sign(payload, 3600);

      expect(result.isSuccess).toBe(true);
    });

    it('should handle complex payload', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com',
        roles: ['admin', 'user'],
        permissions: ['read', 'write', 'delete']
      };

      const result = await service.sign(payload);

      expect(result.isSuccess).toBe(true);
    });

    it('should handle empty roles array', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com',
        roles: []
      };

      const result = await service.sign(payload);

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('verify()', () => {
    it('should verify valid token', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com',
        roles: ['user']
      };

      const signResult = await service.sign(payload);
      const token = signResult.getValue();

      const verifyResult = await service.verify(token);

      expect(verifyResult.isSuccess).toBe(true);
      expect(verifyResult.getValue().userId).toBe(payload.userId);
      expect(verifyResult.getValue().email).toBe(payload.email);
    });

    it('should preserve all payload fields', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com',
        roles: ['admin', 'user'],
        permissions: ['read', 'write']
      };

      const signResult = await service.sign(payload);
      const token = signResult.getValue();

      const verifyResult = await service.verify(token);

      expect(verifyResult.isSuccess).toBe(true);
      expect(verifyResult.getValue().roles).toEqual(payload.roles);
      expect(verifyResult.getValue().permissions).toEqual(payload.permissions);
    });

    it('should fail for invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      const result = await service.verify(invalidToken);

      expect(result.isFailure).toBe(true);
    });

    it('should fail for expired token', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com'
      };

      const signResult = await service.sign(payload, '1ms');
      const token = signResult.getValue();

      await new Promise(resolve => setTimeout(resolve, 10));

      const verifyResult = await service.verify(token);

      expect(verifyResult.isFailure).toBe(true);
    });

    it('should fail for token with wrong secret', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com'
      };

      const otherService = new JwtTokenService('different-secret');
      const signResult = await otherService.sign(payload);
      const token = signResult.getValue();

      const verifyResult = await service.verify(token);

      expect(verifyResult.isFailure).toBe(true);
    });

    it('should fail for malformed token', async () => {
      const malformedToken = 'not.a.valid.jwt.token';

      const result = await service.verify(malformedToken);

      expect(result.isFailure).toBe(true);
    });

    it('should include standard JWT claims', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com'
      };

      const signResult = await service.sign(payload);
      const token = signResult.getValue();

      const verifyResult = await service.verify(token);
      const decoded = verifyResult.getValue() as any;

      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('decode()', () => {
    it('should decode token without verification', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com'
      };

      const signResult = await service.sign(payload);
      const token = signResult.getValue();

      const decodeResult = service.decode(token);

      expect(decodeResult.isSuccess).toBe(true);
      expect(decodeResult.getValue()?.userId).toBe(payload.userId);
    });

    it('should decode expired token', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com'
      };

      const signResult = await service.sign(payload, '1ms');
      const token = signResult.getValue();

      await new Promise(resolve => setTimeout(resolve, 10));

      const decodeResult = service.decode(token);

      expect(decodeResult.isSuccess).toBe(true);
      expect(decodeResult.getValue()?.userId).toBe(payload.userId);
    });

    it('should decode token signed with different secret', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com'
      };

      const otherService = new JwtTokenService('other-secret');
      const signResult = await otherService.sign(payload);
      const token = signResult.getValue();

      const decodeResult = service.decode(token);

      expect(decodeResult.isSuccess).toBe(true);
      expect(decodeResult.getValue()?.userId).toBe(payload.userId);
    });

    it('should handle malformed token', () => {
      const malformedToken = 'invalid-token';

      const result = service.decode(malformedToken);

      // jwt.decode returns null for invalid tokens
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeNull();
    });
  });

  describe('Token Lifecycle', () => {
    it('should support full token lifecycle', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com',
        roles: ['user']
      };

      const signResult = await service.sign(payload, '1h');
      expect(signResult.isSuccess).toBe(true);
      const token = signResult.getValue();

      const verifyResult = await service.verify(token);
      expect(verifyResult.isSuccess).toBe(true);
      expect(verifyResult.getValue().userId).toBe(payload.userId);

      const decodeResult = service.decode(token);
      expect(decodeResult.isSuccess).toBe(true);
      expect(decodeResult.getValue()?.email).toBe(payload.email);
    });

    it('should support token refresh flow', async () => {
      const originalPayload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com',
        roles: ['user']
      };

      const originalToken = (await service.sign(originalPayload, '15m')).getValue();

      const verifyResult = await service.verify(originalToken);
      expect(verifyResult.isSuccess).toBe(true);

      // Extract user data only (remove iat, exp)
      const verified = verifyResult.getValue();
      const refreshedPayload: ITokenPayload = {
        id: verified.id,
        userId: verified.userId,
        email: verified.email,
        roles: verified.roles
      };

      const newToken = (await service.sign(refreshedPayload, '15m')).getValue();

      const verifyNewResult = await service.verify(newToken);
      expect(verifyNewResult.isSuccess).toBe(true);
      expect(verifyNewResult.getValue().userId).toBe(originalPayload.userId);
    });
  });

  describe('Security', () => {
    it('should use different tokens for same payload', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com'
      };

      const token1 = (await service.sign(payload)).getValue();
      
      // Wait 1 second to ensure different iat
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const token2 = (await service.sign(payload)).getValue();

      expect(token1).not.toBe(token2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long expiry times', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user@example.com'
      };

      const result = await service.sign(payload, '365d');

      expect(result.isSuccess).toBe(true);
    });

    it('should handle payload with special characters', async () => {
      const payload: ITokenPayload = {
        id: 'token-1',
        userId: 'user-123',
        email: 'user+test@example.com'
      };

      const signResult = await service.sign(payload);
      expect(signResult.isSuccess).toBe(true);

      const verifyResult = await service.verify(signResult.getValue());
      expect(verifyResult.isSuccess).toBe(true);
      expect(verifyResult.getValue().email).toBe(payload.email);
    });

    it('should handle empty payload', async () => {
      const payload: ITokenPayload = {
        id: '',
        userId: '',
        email: ''
      };

      const result = await service.sign(payload);

      expect(result.isSuccess).toBe(true);
    });
  });
});