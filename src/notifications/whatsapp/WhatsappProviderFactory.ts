import { IWhatsappService } from "@ogza/core";
import { TwilioWhatsappProvider, TwilioWhatsappConfig } from "./providers/TwilioWhatsappProvider";
import { MetaBusinessWhatsappProvider, MetaBusinessWhatsappConfig } from "./providers/MetaBusinessWhatsappProvider";

/**
 * WhatsappProviderFactory - WhatsApp provider oluşturma factory
 * 
 * Desteklenen provider'lar:
 * - TWILIO: Twilio WhatsApp Business API
 * - META: Meta (Facebook) Business WhatsApp API
 */
export class WhatsappProviderFactory {
  static create(
    provider: 'TWILIO' | 'META', 
    config: TwilioWhatsappConfig | MetaBusinessWhatsappConfig
  ): IWhatsappService {
    switch (provider) {
      case 'TWILIO':
        return new TwilioWhatsappProvider(config as TwilioWhatsappConfig);
      
      case 'META':
        return new MetaBusinessWhatsappProvider(config as MetaBusinessWhatsappConfig);
      
      default:
        throw new Error(`Bilinmeyen WhatsApp Sağlayıcısı: ${provider}`);
    }
  }
}