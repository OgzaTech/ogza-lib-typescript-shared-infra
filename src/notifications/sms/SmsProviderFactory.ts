import { ISmsService } from "@ogza/core";

export class SmsProviderFactory {
  static create(providerType: string, config: any): ISmsService {
    switch (providerType) {
        
      default:
        throw new Error(`Desteklenmeyen SMS Sağlayıcısı: ${providerType}`);
    }
  }
}