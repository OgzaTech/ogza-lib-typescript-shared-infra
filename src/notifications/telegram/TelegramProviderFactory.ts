import { ITelegramService } from "@ogza/core";
import { TelegrafProvider, TelegrafConfig } from "./providers/TelegrafProvider";

/**
 * TelegramProviderFactory - Telegram provider oluşturma factory
 * 
 * Desteklenen provider'lar:
 * - TELEGRAF: Telegraf kütüphanesi kullanarak Telegram bot
 */
export class TelegramProviderFactory {
  static create(provider: 'TELEGRAF', config: TelegrafConfig): ITelegramService {
    if (provider === 'TELEGRAF') {
      return new TelegrafProvider(config);
    }
    throw new Error(`Bilinmeyen Telegram Sağlayıcısı: ${provider}`);
  }
}