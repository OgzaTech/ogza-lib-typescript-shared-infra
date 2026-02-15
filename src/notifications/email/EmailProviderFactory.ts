import { IEmailService } from "@ogza/core";
import { NodemailerConfig, NodemailerProvider } from "./providers/NodemailerProvider";

/**
 * EmailProviderFactory - Email provider oluşturma factory
 * 
 * Desteklenen provider'lar:
 * - NODEMAILER: SMTP kullanarak email gönderimi
 */
export class EmailProviderFactory {
  static create(provider: 'NODEMAILER', config: NodemailerConfig): IEmailService {
    if (provider === 'NODEMAILER') {
      return new NodemailerProvider(config);
    }
    throw new Error('Unsupported Email Provider');
  }
}