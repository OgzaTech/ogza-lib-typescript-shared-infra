import { IEmailService, INotificationRequest, INotificationService, ISmsService, ITelegramService, IWebSocketService, IWhatsappService, NotificationChannel, Result } from "@ogza/core";

export class NotificationManager implements INotificationService {
  // Tüm alt servisleri constructor'da alıyoruz (Dependency Injection)
  constructor(
    private emailService?: IEmailService,
    private telegramService?: ITelegramService,
    private smsService?: ISmsService,
    private whatsappService?: IWhatsappService,
    private webSocketService?: IWebSocketService
  ) {}

  /**
   * TEK GİRİŞ KAPISI
   * Dışarıdan kimse "Hangi servisi kullansam?" diye düşünmez.
   * Sadece buraya isteği atar, gerisine karışmaz.
   */
  async send(request: INotificationRequest): Promise<Result<void>> {
    
    switch (request.channel) {
      
      case NotificationChannel.EMAIL:
        if (!this.emailService) return Result.fail('Email service not configured');
        // TypeScript burada request'in EmailNotification olduğunu anlar (Discriminated Union)
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
        return this.webSocketService.send(request); // Generic metod adı 'send' olduğu için hata vermez

      default:
        return Result.fail('Unsupported notification channel');
    }
  }

  // Opsiyonel: Toplu Gönderim
  async sendBatch(requests: INotificationRequest[]): Promise<Result<void>> {
    const promises = requests.map(req => this.send(req));
    // Hepsinin bitmesini bekle (Promise.all veya allSettled kullanılabilir)
    await Promise.all(promises);
    return Result.ok<void>();
  }
}