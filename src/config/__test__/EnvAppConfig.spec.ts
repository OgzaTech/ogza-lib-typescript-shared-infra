import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnvAppConfig } from '../EnvAppConfig';

describe('EnvAppConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Orijinal env'i sakla
    originalEnv = { ...process.env };
    
    // Temiz bir env ile başla
    process.env = {
      NODE_ENV: 'test',
      TEST_STRING: 'hello',
      TEST_NUMBER: '42',
      TEST_BOOLEAN_TRUE: 'true',
      TEST_BOOLEAN_FALSE: 'false',
      TEST_BOOLEAN_YES: 'yes',
      TEST_BOOLEAN_NO: 'no',
      TEST_BOOLEAN_ONE: '1',
      TEST_BOOLEAN_ZERO: '0',
      DATABASE_URL: 'postgresql://localhost:5432/db',
      API_KEY: 'secret-key-12345',
      APP_DEBUG: 'true',
      APP_PORT: '3000'
    };
  });

  afterEach(() => {
    // Orijinal env'i geri yükle
    process.env = originalEnv;
  });

  describe('Initialization', () => {
    it('should create instance without required keys', () => {
      expect(() => new EnvAppConfig()).not.toThrow();
    });

    it('should validate required keys on init when validateOnInit is true', () => {
      expect(() => {
        new EnvAppConfig(['MISSING_KEY'], true);
      }).toThrow('Missing required environment variables: MISSING_KEY');
    });

    it('should not validate on init when validateOnInit is false', () => {
      expect(() => {
        new EnvAppConfig(['MISSING_KEY'], false);
      }).not.toThrow();
    });

    it('should validate multiple missing keys', () => {
      expect(() => {
        new EnvAppConfig(['MISSING_KEY_1', 'MISSING_KEY_2'], true);
      }).toThrow('MISSING_KEY_1, MISSING_KEY_2');
    });

    it('should not throw when all required keys are present', () => {
      expect(() => {
        new EnvAppConfig(['TEST_STRING', 'TEST_NUMBER'], true);
      }).not.toThrow();
    });
  });

  describe('get()', () => {
    let config: EnvAppConfig;

    beforeEach(() => {
      config = new EnvAppConfig();
    });

    it('should return existing environment variable', () => {
      expect(config.get('TEST_STRING')).toBe('hello');
    });

    it('should return default value for missing key', () => {
      expect(config.get('MISSING_KEY', 'default')).toBe('default');
    });

    it('should return empty string for missing key without default', () => {
      expect(config.get('MISSING_KEY')).toBe('');
    });

    it('should cache values after first read', () => {
        // İlk okuma
        const value1 = config.get('TEST_STRING');
        
        // process.env'i değiştir
        process.env.TEST_STRING = 'changed';
        
        // İkinci okuma - cache'den gelmeli, değişmemiş olmalı
        const value2 = config.get('TEST_STRING');
        
        expect(value1).toBe('hello');
        expect(value2).toBe('hello'); // Cache'den okuduğu için hala 'hello' olmalı
    });

    it('should warn for missing non-required keys', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      config.get('MISSING_KEY', 'default');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Config key 'MISSING_KEY' is missing")
      );
      
      consoleSpy.mockRestore();
    });

    it('should error for missing required keys', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const configWithRequired = new EnvAppConfig(['REQUIRED_KEY']);
      configWithRequired.get('REQUIRED_KEY');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Required config key 'REQUIRED_KEY' is missing")
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getNumber()', () => {
    let config: EnvAppConfig;

    beforeEach(() => {
      config = new EnvAppConfig();
    });

    it('should parse valid number', () => {
      expect(config.getNumber('TEST_NUMBER')).toBe(42);
    });

    it('should return default for missing key', () => {
      expect(config.getNumber('MISSING_KEY', 100)).toBe(100);
    });

    it('should return 0 as default when not specified', () => {
      expect(config.getNumber('MISSING_KEY')).toBe(0);
    });

    it('should return default for invalid number', () => {
      process.env.INVALID_NUMBER = 'not-a-number';
      expect(config.getNumber('INVALID_NUMBER', 999)).toBe(999);
    });

    it('should warn for invalid number values', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      process.env.INVALID_NUMBER = 'abc';
      config.getNumber('INVALID_NUMBER');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('is not a valid number')
      );
      
      consoleSpy.mockRestore();
    });

    it('should parse negative numbers', () => {
      process.env.NEGATIVE_NUMBER = '-42';
      expect(config.getNumber('NEGATIVE_NUMBER')).toBe(-42);
    });

    it('should parse float numbers', () => {
      process.env.FLOAT_NUMBER = '3.14';
      expect(config.getNumber('FLOAT_NUMBER')).toBe(3.14);
    });
  });

  describe('getBoolean()', () => {
    let config: EnvAppConfig;

    beforeEach(() => {
      config = new EnvAppConfig();
    });

    it('should return true for "true"', () => {
      expect(config.getBoolean('TEST_BOOLEAN_TRUE')).toBe(true);
    });

    it('should return false for "false"', () => {
      expect(config.getBoolean('TEST_BOOLEAN_FALSE')).toBe(false);
    });

    it('should return true for "yes"', () => {
      expect(config.getBoolean('TEST_BOOLEAN_YES')).toBe(true);
    });

    it('should return false for "no"', () => {
      expect(config.getBoolean('TEST_BOOLEAN_NO')).toBe(false);
    });

    it('should return true for "1"', () => {
      expect(config.getBoolean('TEST_BOOLEAN_ONE')).toBe(true);
    });

    it('should return false for "0"', () => {
      expect(config.getBoolean('TEST_BOOLEAN_ZERO')).toBe(false);
    });

    it('should be case-insensitive', () => {
      process.env.BOOL_UPPER = 'TRUE';
      expect(config.getBoolean('BOOL_UPPER')).toBe(true);
    });

    it('should return default for missing key', () => {
      expect(config.getBoolean('MISSING_KEY', true)).toBe(true);
    });

    it('should return default for invalid boolean value', () => {
      process.env.INVALID_BOOL = 'maybe';
      expect(config.getBoolean('INVALID_BOOL', true)).toBe(true);
    });

    it('should warn for invalid boolean values', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      process.env.INVALID_BOOL = 'invalid';
      config.getBoolean('INVALID_BOOL');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('is not a valid boolean')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle "on" as true', () => {
      process.env.BOOL_ON = 'on';
      expect(config.getBoolean('BOOL_ON')).toBe(true);
    });

    it('should handle "off" as false', () => {
      process.env.BOOL_OFF = 'off';
      expect(config.getBoolean('BOOL_OFF')).toBe(false);
    });
  });

  describe('Environment Detection', () => {
    let config: EnvAppConfig;

    beforeEach(() => {
      config = new EnvAppConfig();
    });

    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(config.isProduction()).toBe(true);
      expect(config.isDevelopment()).toBe(false);
      expect(config.isTest()).toBe(false);
    });

    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(config.isProduction()).toBe(false);
      expect(config.isDevelopment()).toBe(true);
      expect(config.isTest()).toBe(false);
    });

    it('should detect test environment', () => {
      process.env.NODE_ENV = 'test';
      expect(config.isProduction()).toBe(false);
      expect(config.isDevelopment()).toBe(false);
      expect(config.isTest()).toBe(true);
    });
  });

  describe('has()', () => {
    let config: EnvAppConfig;

    beforeEach(() => {
      config = new EnvAppConfig();
    });

    it('should return true for existing key', () => {
      expect(config.has('TEST_STRING')).toBe(true);
    });

    it('should return false for missing key', () => {
      expect(config.has('MISSING_KEY')).toBe(false);
    });
  });

  describe('getMany()', () => {
    let config: EnvAppConfig;

    beforeEach(() => {
      config = new EnvAppConfig();
    });

    it('should return multiple keys as object', () => {
      const result = config.getMany(['TEST_STRING', 'TEST_NUMBER']);
      
      expect(result).toEqual({
        TEST_STRING: 'hello',
        TEST_NUMBER: '42'
      });
    });

    it('should include missing keys with default values', () => {
      const result = config.getMany(['TEST_STRING', 'MISSING_KEY']);
      
      expect(result).toEqual({
        TEST_STRING: 'hello',
        MISSING_KEY: ''
      });
    });
  });

  describe('getByPrefix()', () => {
    let config: EnvAppConfig;

    beforeEach(() => {
      config = new EnvAppConfig();
    });

    it('should return all keys with given prefix', () => {
      const result = config.getByPrefix('APP_');
      
      expect(result).toEqual({
        APP_DEBUG: 'true',
        APP_PORT: '3000'
      });
    });

    it('should return empty object for non-existent prefix', () => {
      const result = config.getByPrefix('NONEXISTENT_');
      
      expect(result).toEqual({});
    });

    it('should handle empty prefix', () => {
      const result = config.getByPrefix('');
      
      // Should return all environment variables
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });

  describe('getSafe()', () => {
    let config: EnvAppConfig;

    beforeEach(() => {
      config = new EnvAppConfig();
    });

    it('should return Result.ok for existing key', () => {
      const result = config.getSafe('TEST_STRING');
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe('hello');
    });

    it('should return Result.fail for missing key', () => {
      const result = config.getSafe('MISSING_KEY');
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('is not defined');
    });
  });

  describe('clearCache()', () => {
    let config: EnvAppConfig;

    beforeEach(() => {
      config = new EnvAppConfig();
    });

    it('should clear cached values', () => {
      // İlk okuma - cache'e ekler
      config.get('TEST_STRING');
      
      // Env'i değiştir
      process.env.TEST_STRING = 'changed';
      
      // Cache'den okur - hala eski değer
      expect(config.get('TEST_STRING')).toBe('hello');
      
      // Cache'i temizle
      config.clearCache();
      
      // Yeni değeri okur
      expect(config.get('TEST_STRING')).toBe('changed');
    });
  });

  describe('logConfig()', () => {
    let config: EnvAppConfig;

    beforeEach(() => {
      config = new EnvAppConfig();
    });

    it('should log all config values', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      config.logConfig();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Current configuration'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });

    it('should mask sensitive keys', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      config.logConfig(['API_KEY', 'DATABASE_URL']);
      
      const loggedConfig = consoleSpy.mock.calls[0][1];
      
      expect(loggedConfig.API_KEY).toBe('***MASKED***');
      expect(loggedConfig.DATABASE_URL).toBe('***MASKED***');
      expect(loggedConfig.TEST_STRING).toBe('hello');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    let config: EnvAppConfig;

    beforeEach(() => {
      config = new EnvAppConfig();
    });

    it('should handle empty string environment variable', () => {
      process.env.EMPTY_STRING = '';
      expect(config.get('EMPTY_STRING')).toBe('');
    });

    it('should handle whitespace-only environment variable', () => {
      process.env.WHITESPACE = '   ';
      expect(config.get('WHITESPACE')).toBe('   ');
    });

    it('should handle special characters in values', () => {
      process.env.SPECIAL_CHARS = 'hello@world!#$%^&*()';
      expect(config.get('SPECIAL_CHARS')).toBe('hello@world!#$%^&*()');
    });

    it('should handle very long values', () => {
      const longValue = 'a'.repeat(10000);
      process.env.LONG_VALUE = longValue;
      expect(config.get('LONG_VALUE')).toBe(longValue);
    });
  });
});