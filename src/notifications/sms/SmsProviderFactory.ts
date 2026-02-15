import { ISmsService } from "@ogza/core";
import { TwilioSmsProvider, TwilioSmsConfig } from "./providers/TwilioSmsProvider";
import { NetGsmSmsProvider, NetGsmConfig } from "./providers/NetGsmSmsProvider";

/**
 * SmsProviderFactory - SMS provider oluşturma factory
 * 
 * Desteklenen provider'lar:
 * - TWILIO: Uluslararası SMS servisi
 * - NETGSM: Türkiye için SMS servisi
 */
export class SmsProviderFactory {
  static create(providerType: 'TWILIO' | 'NETGSM', config: TwilioSmsConfig | NetGsmConfig): ISmsService {
    switch (providerType) {
      case 'TWILIO':
        return new TwilioSmsProvider(config as TwilioSmsConfig);
      
      case 'NETGSM':
        return new NetGsmSmsProvider(config as NetGsmConfig);
        
      default:
        throw new Error(`Desteklenmeyen SMS Sağlayıcısı: ${providerType}`);
    }
  }
}