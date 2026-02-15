import { IAppConfig } from "@ogza/core";

export class EnvAppConfig implements IAppConfig {
  
  get(key: string): string {
    const value = process.env[key];
    if (value === undefined) {
      console.warn(`[AppConfig]: Config key '${key}' is missing.`);
      return ''; 
    }
    return value;
  }

  getNumber(key: string): number {
    const value = this.get(key);
    return Number(value);
  }

  getBoolean(key: string): boolean {
    const value = this.get(key).toLowerCase();
    return value === 'true' || value === '1' || value === 'yes';
  }

  isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }
}