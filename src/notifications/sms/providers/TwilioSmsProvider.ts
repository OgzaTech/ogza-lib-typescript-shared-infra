import { ISmsNotification, ISmsService, Result } from "@ogza/core";
import twilio from 'twilio';

export interface TwilioSmsConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string; // Twilio phone number
}

/**
 * TwilioSmsProvider - Twilio API kullanarak SMS gönderimi
 * 
 * @implements {ISmsService}
 */
export class TwilioSmsProvider implements ISmsService {
  private client: twilio.Twilio;
  private config: TwilioSmsConfig;

  constructor(config: TwilioSmsConfig) {
    this.config = config;
    this.client = twilio(config.accountSid, config.authToken);
  }

  async send(request: ISmsNotification): Promise<Result<void>> {
    try {
      await this.client.messages.create({
        body: request.content,
        from: this.config.fromNumber,
        to: request.phoneNumber
      });

      return Result.ok<void>();
    } catch (error: any) {
      console.error('Twilio SMS Send Error:', error);
      return Result.fail<void>(`SMS Error: ${error.message || 'Unknown error'}`);
    }
  }
}