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

/**
 * NodemailerProvider - Nodemailer kullanarak email gönderimi
 * 
 * @implements {IEmailService}
 */
export class NodemailerProvider implements IEmailService {
  private transporter: nodemailer.Transporter;
  private config: NodemailerConfig;

  constructor(config: NodemailerConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  async send(request: IEmailNotification): Promise<Result<void>> {
    try {
      await this.transporter.sendMail({
        from: this.config.defaultFrom,
        to: request.recipient,
        subject: request.subject,
        html: request.content,
        attachments: request.attachments,
      });

      return Result.ok<void>();
    } catch (error: any) {
      console.error('Nodemailer Send Error:', error);
      return Result.fail<void>(`Email Error: ${error.message || 'Unknown error'}`);
    }
  }
}