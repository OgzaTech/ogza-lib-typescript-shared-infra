import * as nodemailer from 'nodemailer';

import { IEmailNotification, IEmailService, Result } from "@ogza/core";

export interface NodemailerConfig {
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  auth: {
    user: string;
    pass: string;
  };
  defaultFrom: string; // Gönderen varsayılan adres
}

export class NodemailerProvider implements IEmailService {
  private transporter: nodemailer.Transporter;
  private config: NodemailerConfig;

  constructor(config: NodemailerConfig) {
    this.config = config;
    // SMTP bağlantısını kuruyoruz
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  async send(request: IEmailNotification): Promise<Result<void>> {
    try {
      // Mail gönderimi
      await this.transporter.sendMail({
        from: this.config.defaultFrom, // Varsayılan gönderici
        to: request.recipient,
        subject: request.subject,
        html: request.content, // HTML içeriği (Core modelinde 'body' demiştik)
       // text: request.metadata.replace(/<[^>]*>?/gm, ''), // HTML taglerini temizleyip düz metin de ekleyebiliriz (Fallback)
        attachments: request.attachments, // Varsa ekler
      });

      return Result.ok<void>();
    } catch (error: any) {
      console.error('Nodemailer Send Error:', error);
      return Result.fail<void>(`Email Error: ${error.message || 'Unknown error'}`);
    }
  }
}
