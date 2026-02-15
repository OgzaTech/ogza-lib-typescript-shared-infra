import { IWhatsappNotification, IWhatsappService, Result } from "@ogza/core";
import twilio from 'twilio';

export interface TwilioWhatsappConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string; // Twilio WhatsApp number (e.g., whatsapp:+14155238886)
}

/**
 * TwilioWhatsappProvider - Twilio WhatsApp Business API kullanarak mesaj gönderimi
 * 
 * @implements {IWhatsappService}
 */
export class TwilioWhatsappProvider implements IWhatsappService {
  private client: twilio.Twilio;
  private config: TwilioWhatsappConfig;

  constructor(config: TwilioWhatsappConfig) {
    this.config = config;
    this.client = twilio(config.accountSid, config.authToken);
  }

  async send(request: IWhatsappNotification): Promise<Result<void>> {
    try {
      // Twilio WhatsApp format: whatsapp:+1234567890
      const fromNumber = this.formatWhatsAppNumber(this.config.fromNumber);
      const toNumber = this.formatWhatsAppNumber(request.phoneNumber);

      await this.client.messages.create({
        body: request.content,
        from: fromNumber,
        to: toNumber
      });

      return Result.ok<void>();
    } catch (error: any) {
      console.error('Twilio WhatsApp Send Error:', error);
      return Result.fail<void>(`WhatsApp Error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Telefon numarasını Twilio WhatsApp formatına çevirir
   * Örnek: +1234567890 -> whatsapp:+1234567890
   */
  private formatWhatsAppNumber(phoneNumber: string): string {
    if (phoneNumber.startsWith('whatsapp:')) {
      return phoneNumber;
    }
    
    // Eğer + ile başlamıyorsa ekle
    const normalized = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber}`;
    
    return `whatsapp:${normalized}`;
  }
}