import { ITelegramNotification, ITelegramService, Result } from "@ogza/core";
import { Telegraf } from "telegraf";

export interface TelegrafConfig {
  botToken: string;
}

/**
 * TelegrafProvider - Telegraf kütüphanesi kullanarak Telegram mesaj gönderimi
 * 
 * @implements {ITelegramService}
 */
export class TelegrafProvider implements ITelegramService {
  private bot: Telegraf;

  constructor(config: TelegrafConfig) {
    this.bot = new Telegraf(config.botToken);
  }

  async send(request: ITelegramNotification): Promise<Result<void>> {
    try {
      await this.bot.telegram.sendMessage(request.chatId, request.message, {
        parse_mode: request.parseMode || undefined,
      });

      return Result.ok<void>();
    } catch (error: any) {
      console.error('Telegraf Send Error:', error);
      return Result.fail<void>(`Telegram Error: ${error.message || 'Unknown error'}`);
    }
  }
}