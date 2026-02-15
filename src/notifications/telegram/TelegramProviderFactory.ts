import { ITelegramService } from "@ogza/core";
import { TelegrafProvider } from "./providers/TelegrafProvider";

export class TelegramProviderFactory {
  static create(provider: 'TELEGRAF', config: any): ITelegramService {
    // Şimdilik tek seçenek var ama yapı bozulmadı
    return new TelegrafProvider(config);
  }
}