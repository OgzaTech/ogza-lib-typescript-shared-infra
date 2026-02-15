import { IAppConfig, Result } from "@ogza/core";

/**
 * EnvAppConfig - Environment variable tabanlı konfigürasyon yönetimi
 * 
 * Sorumluluklar:
 * - Environment değişkenlerini okuma
 * - Tip dönüşümleri (string, number, boolean)
 * - Varsayılan değer yönetimi
 * - Eksik konfigürasyon uyarıları
 * - Environment bazlı koşullu davranışlar
 * 
 * @implements {IAppConfig}
 */
export class EnvAppConfig implements IAppConfig {
  private readonly requiredKeys: Set<string> = new Set();
  private readonly cache: Map<string, string> = new Map();

  /**
   * @param validateOnInit - true ise constructor'da required keys kontrolü yapar
   */
  constructor(
    requiredKeys: string[] = [],
    private readonly validateOnInit: boolean = false
  ) {
    this.requiredKeys = new Set(requiredKeys);
    
    if (this.validateOnInit) {
      this.validateRequiredKeys();
    }
  }

  /**
   * Required key'leri kontrol eder
   * Eksik olan key'ler için hata fırlatır
   */
  private validateRequiredKeys(): void {
    const missingKeys: string[] = [];

    for (const key of this.requiredKeys) {
      if (process.env[key] === undefined) {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingKeys.join(', ')}`
      );
    }
  }

  /**
   * Environment değişkenini string olarak okur
   * @param key - Environment variable adı
   * @param defaultValue - Bulunamazsa dönülecek varsayılan değer
   */
  get(key: string, defaultValue: string = ''): string {
    // Cache kontrolü (performans için)
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const value = process.env[key];
    
    if (value === undefined) {
      if (this.requiredKeys.has(key)) {
        console.error(`[AppConfig]: Required config key '${key}' is missing!`);
      } else {
        console.warn(`[AppConfig]: Config key '${key}' is missing, using default: '${defaultValue}'`);
      }
      return defaultValue;
    }

    // Cache'e ekle
    this.cache.set(key, value);
    return value;
  }

  /**
   * Environment değişkenini number olarak okur
   * Parse edilemezse defaultValue döner
   */
  getNumber(key: string, defaultValue: number = 0): number {
    const value = this.get(key);
    
    if (!value) return defaultValue;

    const parsed = Number(value);
    
    if (isNaN(parsed)) {
      console.warn(
        `[AppConfig]: Config key '${key}' value '${value}' is not a valid number, using default: ${defaultValue}`
      );
      return defaultValue;
    }

    return parsed;
  }

  /**
   * Environment değişkenini boolean olarak okur
   * Kabul edilen değerler: true, 1, yes (case-insensitive)
   */
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.get(key).toLowerCase();
    
    if (!value) return defaultValue;

    // Truthy values
    if (['true', '1', 'yes', 'on'].includes(value)) {
      return true;
    }

    // Falsy values
    if (['false', '0', 'no', 'off'].includes(value)) {
      return false;
    }

    console.warn(
      `[AppConfig]: Config key '${key}' value '${value}' is not a valid boolean, using default: ${defaultValue}`
    );
    return defaultValue;
  }

  /**
   * Uygulamanın production modda çalışıp çalışmadığını kontrol eder
   */
  isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  /**
   * Uygulamanın development modda çalışıp çalışmadığını kontrol eder
   */
  isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }

  /**
   * Uygulamanın test modda çalışıp çalışmadığını kontrol eder
   */
  isTest(): boolean {
    return this.get('NODE_ENV') === 'test';
  }

  /**
   * Belirli bir key'in tanımlı olup olmadığını kontrol eder
   */
  has(key: string): boolean {
    return process.env[key] !== undefined;
  }

  /**
   * Birden fazla key'i aynı anda okur
   * @returns Record<key, value>
   */
  getMany(keys: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const key of keys) {
      result[key] = this.get(key);
    }

    return result;
  }

  /**
   * Environment prefix'i ile tüm değerleri okur
   * Örnek: APP_ prefix'i ile başlayan tüm değerler
   */
  getByPrefix(prefix: string): Record<string, string> {
    const result: Record<string, string> = {};

    for (const key in process.env) {
      if (key.startsWith(prefix)) {
        result[key] = process.env[key] || '';
      }
    }

    return result;
  }

  /**
   * Belirli bir key için Result pattern ile güvenli okuma
   * Eksik key'ler için Result.fail döner
   */
  getSafe(key: string): Result<string> {
    const value = process.env[key];
    
    if (value === undefined) {
      return Result.fail(`Config key '${key}' is not defined`);
    }

    return Result.ok(value);
  }

  /**
   * Cache'i temizler
   * Test senaryolarında veya runtime config değişikliklerinde kullanılır
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Tüm konfigürasyonu log'lar (sensitive data maskelenir)
   */
  logConfig(sensitiveKeys: string[] = []): void {
    const config: Record<string, string> = {};

    for (const key in process.env) {
      if (sensitiveKeys.includes(key)) {
        config[key] = '***MASKED***';
      } else {
        config[key] = process.env[key] || '';
      }
    }

    console.log('[AppConfig]: Current configuration:', config);
  }
}