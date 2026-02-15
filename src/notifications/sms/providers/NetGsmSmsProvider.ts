import { ISmsNotification, ISmsService, Result } from "@ogza/core";
import axios from 'axios';

export interface NetGsmConfig {
  userCode: string;
  password: string;
  header: string; // SMS başlığı (firmaya özel)
  apiUrl?: string;
}

/**
 * NetGsmSmsProvider - NetGSM API kullanarak SMS gönderimi
 * Türkiye'de yaygın kullanılan bir SMS sağlayıcısı
 * 
 * @implements {ISmsService}
 */
export class NetGsmSmsProvider implements ISmsService {
  private config: NetGsmConfig;
  private readonly apiUrl: string;

  constructor(config: NetGsmConfig) {
    this.config = config;
    this.apiUrl = config.apiUrl || 'https://api.netgsm.com.tr/sms/send/get';
  }

  async send(request: ISmsNotification): Promise<Result<void>> {
    try {
      // NetGSM API format
      const params = {
        usercode: this.config.userCode,
        password: this.config.password,
        gsmno: this.normalizePhoneNumber(request.phoneNumber),
        message: request.content,
        msgheader: this.config.header
      };

      const response = await axios.get(this.apiUrl, { params });

      // NetGSM başarılı gönderimde "00" veya "01" gibi kodlar döner
      const responseCode = response.data.toString().trim();
      
      if (responseCode.startsWith('00') || responseCode.startsWith('01')) {
        return Result.ok<void>();
      }

      // Hata kodlarını anlamlandır
      const errorMessage = this.parseErrorCode(responseCode);
      return Result.fail<void>(`NetGSM Error: ${errorMessage}`);

    } catch (error: any) {
      console.error('NetGSM SMS Send Error:', error);
      return Result.fail<void>(`SMS Error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Telefon numarasını NetGSM formatına çevirir
   * Örnek: +905551234567 -> 5551234567
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Boşluk, tire ve parantez gibi karakterleri temizle
    let normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // +90 veya 0090 ile başlıyorsa kaldır
    if (normalized.startsWith('+90')) {
      normalized = normalized.substring(3);
    } else if (normalized.startsWith('0090')) {
      normalized = normalized.substring(4);
    } else if (normalized.startsWith('90')) {
      normalized = normalized.substring(2);
    }
    
    // Başında 0 varsa kaldır
    if (normalized.startsWith('0')) {
      normalized = normalized.substring(1);
    }

    return normalized;
  }

  /**
   * NetGSM hata kodlarını anlamlandırır
   */
  private parseErrorCode(code: string): string {
    const errorCodes: Record<string, string> = {
      '20': 'Mesaj metninde hata var',
      '30': 'Geçersiz kullanıcı adı veya şifre',
      '40': 'Mesaj başlığı (header) sisteme tanımlı değil',
      '50': 'Abone hesabınız ile ilgili bir problem var',
      '51': 'Kredi yetersiz',
      '60': 'Gönderim sınırı aşıldı',
      '70': 'Hatalı sorgulama',
      '80': 'Gönderilecek telefon numarası hatalı',
      '85': 'Mesaj gönderim tarihi formatı hatalı'
    };

    return errorCodes[code] || `Bilinmeyen hata (${code})`;
  }
}