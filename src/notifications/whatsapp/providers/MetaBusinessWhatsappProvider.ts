import { IWhatsappNotification, IWhatsappService, Result } from "@ogza/core";
import axios from 'axios';

export interface MetaBusinessWhatsappConfig {
  phoneNumberId: string; // WhatsApp Business Phone Number ID
  accessToken: string;   // Meta Business API Access Token
  apiVersion?: string;   // Default: v18.0
}

/**
 * MetaBusinessWhatsappProvider - Meta (Facebook) Business API kullanarak WhatsApp mesaj gönderimi
 * 
 * @implements {IWhatsappService}
 */
export class MetaBusinessWhatsappProvider implements IWhatsappService {
  private config: MetaBusinessWhatsappConfig;
  private readonly baseUrl: string;

  constructor(config: MetaBusinessWhatsappConfig) {
    this.config = config;
    const apiVersion = config.apiVersion || 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`;
  }

  async send(request: IWhatsappNotification): Promise<Result<void>> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.normalizePhoneNumber(request.phoneNumber),
        type: 'text',
        text: {
          preview_url: false,
          body: request.content
        }
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Meta API başarılı gönderimde message ID döner
      if (response.data && response.data.messages) {
        return Result.ok<void>();
      }

      return Result.fail<void>('WhatsApp message send failed');

    } catch (error: any) {
      console.error('Meta WhatsApp Send Error:', error.response?.data || error);
      
      const errorMessage = error.response?.data?.error?.message 
        || error.message 
        || 'Unknown error';
      
      return Result.fail<void>(`WhatsApp Error: ${errorMessage}`);
    }
  }

  /**
   * Telefon numarasını Meta API formatına çevirir
   * + işareti olmadan, sadece rakamlar
   * Örnek: +905551234567 -> 905551234567
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  }

  /**
   * Template mesaj gönderimi için yardımcı metod
   * (Daha gelişmiş senaryolar için)
   */
  async sendTemplate(
    phoneNumber: string,
    templateName: string,
    languageCode: string = 'en',
    components?: any[]
  ): Promise<Result<void>> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.normalizePhoneNumber(phoneNumber),
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components: components || []
        }
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.messages) {
        return Result.ok<void>();
      }

      return Result.fail<void>('WhatsApp template send failed');

    } catch (error: any) {
      console.error('Meta WhatsApp Template Send Error:', error.response?.data || error);
      
      const errorMessage = error.response?.data?.error?.message 
        || error.message 
        || 'Unknown error';
      
      return Result.fail<void>(`WhatsApp Error: ${errorMessage}`);
    }
  }
}