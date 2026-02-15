import { IEmailService, INotificationRequest, INotificationService, ISmsService, ITelegramService, IWebSocketService, IWhatsappService, NotificationChannel, Result } from "@ogza/core";

/**
 * NotificationManager - Tüm bildirim kanallarını yöneten merkezi servis
 * 
 * @implements {INotificationService}
 */
export class NotificationManager implements INotificationService {
  constructor(
    private emailService?: IEmailService,
    private telegramService?: ITelegramService,
    private smsService?: ISmsService,
    private whatsappService?: IWhatsappService,
    private webSocketService?: IWebSocketService
  ) {}

  async send(request: INotificationRequest): Promise<Result<void>> {
    switch (request.channel) {
      case NotificationChannel.EMAIL:
        if (!this.emailService) return Result.fail('Email service not configured');
        return this.emailService.send(request);

      case NotificationChannel.TELEGRAM:
        if (!this.telegramService) return Result.fail('Telegram service not configured');
        return this.telegramService.send(request);

      case NotificationChannel.SMS:
        if (!this.smsService) return Result.fail('SMS service not configured');
        return this.smsService.send(request);

      case NotificationChannel.WHATSAPP:
        if (!this.whatsappService) return Result.fail('WhatsApp service not configured');
        return this.whatsappService.send(request);

      case NotificationChannel.WEBSOCKET:
        if (!this.webSocketService) return Result.fail('WebSocket service not configured');
        return this.webSocketService.send(request);

      default:
        return Result.fail('Unsupported notification channel');
    }
  }

  async sendBatch(requests: INotificationRequest[]): Promise<Result<void>> {
    const promises = requests.map(req => this.send(req));
    await Promise.all(promises);
    return Result.ok<void>();
  }
}