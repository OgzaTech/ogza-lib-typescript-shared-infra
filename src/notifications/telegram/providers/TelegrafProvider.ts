import { ITelegramNotification, ITelegramService, Result } from "@ogza/core";
import { Telegraf } from "telegraf";

export interface TelegrafConfig {
  botToken: string;
}

export class TelegrafProvider implements ITelegramService {
  private bot: Telegraf;

  constructor(config: TelegrafConfig) {
    // Bot instance'ını başlatıyoruz
    this.bot = new Telegraf(config.botToken);
  }

  async send(request: ITelegramNotification): Promise<Result<void>> {
    try {
      // Core'dan gelen isteği Telegraf'ın formatına çeviriyoruz
      await this.bot.telegram.sendMessage(request.chatId, request.message, {
        parse_mode: request.parseMode || undefined, // HTML veya Markdown desteği
        // reply_to_message_id gibi ekstra alanlar varsa buraya eklenebilir
      });

      return Result.ok<void>();
    } catch (error: any) {
      // Hata durumunda loglayıp Result.fail dönüyoruz
      console.error('Telegraf Send Error:', error);
      return Result.fail<void>(`Telegram Error: ${error.message || 'Unknown error'}`);
    }
  }
}