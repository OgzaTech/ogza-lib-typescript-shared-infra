import { IWhatsappService } from "@ogza/core";

export class WhatsappProviderFactory {
  static create(provider: 'TWILIO' | 'META', config: any): IWhatsappService {
    switch (provider) {
      default: throw new Error('Bilinmeyen WP Sağlayıcısı');
    }
  }
}