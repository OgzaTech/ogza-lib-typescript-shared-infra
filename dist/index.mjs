import {
  AxiosHttpClient
} from "./chunk-3QGC5NGI.mjs";

// src/crypto/NodeEncryptionService.ts
import * as crypto from "crypto";
import { Result, LocalizationService, CoreKeys } from "@ogza/core";
var NodeEncryptionService = class {
  constructor(secretKey) {
    this.algorithm = "aes-256-cbc";
    this.ivLength = 16;
    this.key = crypto.createHash("sha256").update(String(secretKey)).digest();
  }
  async encrypt(plainText) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      let encrypted = cipher.update(plainText, "utf8", "hex");
      encrypted += cipher.final("hex");
      return Result.ok(`${iv.toString("hex")}:${encrypted}`);
    } catch (err) {
      const msg = LocalizationService.t(CoreKeys.INFRA.ENCRYPTION_FAILED);
      return Result.fail(`${msg}: ${err.message}`);
    }
  }
  async decrypt(cipherText) {
    try {
      const textParts = cipherText.split(":");
      if (textParts.length !== 2) {
        return Result.fail(LocalizationService.t(CoreKeys.INFRA.INVALID_CIPHER_FORMAT));
      }
      const iv = Buffer.from(textParts[0], "hex");
      const encryptedText = Buffer.from(textParts[1], "hex");
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return Result.ok(decrypted.toString());
    } catch (err) {
      const msg = LocalizationService.t(CoreKeys.INFRA.DECRYPTION_FAILED);
      return Result.fail(`${msg}: ${err.message}`);
    }
  }
};

// src/crypto/BcryptHashingService.ts
import * as bcrypt from "bcrypt";
import { Result as Result2, LocalizationService as LocalizationService2, CoreKeys as CoreKeys2 } from "@ogza/core";
var BcryptHashingService = class {
  constructor() {
    this.saltRounds = 10;
  }
  async hash(plainText) {
    try {
      const hashed = await bcrypt.hash(plainText, this.saltRounds);
      return Result2.ok(hashed);
    } catch (err) {
      const msg = LocalizationService2.t(CoreKeys2.INFRA.HASHING_FAILED);
      return Result2.fail(`${msg}: ${err.message}`);
    }
  }
  async compare(plainText, hashedValue) {
    console.log("BcryptHashingService Compare Method");
    try {
      console.log(plainText);
      console.log(hashedValue);
      const match = await bcrypt.compare(plainText, hashedValue);
      console.log("BcryptHashingService Compare Method - Match %s", match);
      return Result2.ok(match);
    } catch (err) {
      const msg = LocalizationService2.t(CoreKeys2.INFRA.HASHING_FAILED);
      console.log(`${msg}: ${err.message}`);
      return Result2.fail(`${msg}: ${err.message}`);
    }
  }
};

// src/auth/JwtTokenService.ts
import * as jwt from "jsonwebtoken";
import {
  Result as Result3,
  LocalizationService as LocalizationService3,
  CoreKeys as CoreKeys3
} from "@ogza/core";
var JwtTokenService = class {
  constructor(secretKey, defaultExpiresIn = "1h") {
    this.secretKey = secretKey;
    this.defaultExpiresIn = defaultExpiresIn;
  }
  async sign(payload, expiresIn) {
    try {
      const plainPayload = JSON.parse(JSON.stringify(payload));
      const options = {
        expiresIn: expiresIn || this.defaultExpiresIn
      };
      const token = jwt.sign(plainPayload, this.secretKey, options);
      return Result3.ok(token);
    } catch (err) {
      return Result3.fail(`Token signing failed: ${err.message}`);
    }
  }
  async verify(token) {
    try {
      const decoded = jwt.verify(token, this.secretKey);
      return Result3.ok(decoded);
    } catch (err) {
      return Result3.fail(LocalizationService3.t(CoreKeys3.ERRORS.UNAUTHORIZED));
    }
  }
  decode(token) {
    try {
      const decoded = jwt.decode(token);
      return Result3.ok(decoded);
    } catch (err) {
      return Result3.fail(`Token decoding failed: ${err.message}`);
    }
  }
};

// src/config/EnvAppConfig.ts
import { Result as Result4 } from "@ogza/core";
var EnvAppConfig = class {
  /**
   * @param validateOnInit - true ise constructor'da required keys kontrolü yapar
   */
  constructor(requiredKeys = [], validateOnInit = false) {
    this.validateOnInit = validateOnInit;
    this.requiredKeys = /* @__PURE__ */ new Set();
    this.cache = /* @__PURE__ */ new Map();
    this.requiredKeys = new Set(requiredKeys);
    if (this.validateOnInit) {
      this.validateRequiredKeys();
    }
  }
  /**
   * Required key'leri kontrol eder
   * Eksik olan key'ler için hata fırlatır
   */
  validateRequiredKeys() {
    const missingKeys = [];
    for (const key of this.requiredKeys) {
      if (process.env[key] === void 0) {
        missingKeys.push(key);
      }
    }
    if (missingKeys.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingKeys.join(", ")}`
      );
    }
  }
  /**
   * Environment değişkenini string olarak okur
   * @param key - Environment variable adı
   * @param defaultValue - Bulunamazsa dönülecek varsayılan değer
   */
  get(key, defaultValue = "") {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const value = process.env[key];
    if (value === void 0) {
      if (this.requiredKeys.has(key)) {
        console.error(`[AppConfig]: Required config key '${key}' is missing!`);
      } else {
        console.warn(`[AppConfig]: Config key '${key}' is missing, using default: '${defaultValue}'`);
      }
      return defaultValue;
    }
    this.cache.set(key, value);
    return value;
  }
  /**
   * Environment değişkenini number olarak okur
   * Parse edilemezse defaultValue döner
   */
  getNumber(key, defaultValue = 0) {
    const value = this.get(key);
    if (!value) return defaultValue;
    const parsed = Number(value);
    if (isNaN(parsed)) {
      console.warn(
        `[AppConfig]: Config key '${key}' value '${value}' is not a valid number, using default: ${defaultValue}`
      );
      return defaultValue;
    }
    return parsed;
  }
  /**
   * Environment değişkenini boolean olarak okur
   * Kabul edilen değerler: true, 1, yes (case-insensitive)
   */
  getBoolean(key, defaultValue = false) {
    const value = this.get(key).toLowerCase();
    if (!value) return defaultValue;
    if (["true", "1", "yes", "on"].includes(value)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(value)) {
      return false;
    }
    console.warn(
      `[AppConfig]: Config key '${key}' value '${value}' is not a valid boolean, using default: ${defaultValue}`
    );
    return defaultValue;
  }
  /**
   * Uygulamanın production modda çalışıp çalışmadığını kontrol eder
   */
  isProduction() {
    return this.get("NODE_ENV") === "production";
  }
  /**
   * Uygulamanın development modda çalışıp çalışmadığını kontrol eder
   */
  isDevelopment() {
    return this.get("NODE_ENV") === "development";
  }
  /**
   * Uygulamanın test modda çalışıp çalışmadığını kontrol eder
   */
  isTest() {
    return this.get("NODE_ENV") === "test";
  }
  /**
   * Belirli bir key'in tanımlı olup olmadığını kontrol eder
   */
  has(key) {
    return process.env[key] !== void 0;
  }
  /**
   * Birden fazla key'i aynı anda okur
   * @returns Record<key, value>
   */
  getMany(keys) {
    const result = {};
    for (const key of keys) {
      result[key] = this.get(key);
    }
    return result;
  }
  /**
   * Environment prefix'i ile tüm değerleri okur
   * Örnek: APP_ prefix'i ile başlayan tüm değerler
   */
  getByPrefix(prefix) {
    const result = {};
    for (const key in process.env) {
      if (key.startsWith(prefix)) {
        result[key] = process.env[key] || "";
      }
    }
    return result;
  }
  /**
   * Belirli bir key için Result pattern ile güvenli okuma
   * Eksik key'ler için Result.fail döner
   */
  getSafe(key) {
    const value = process.env[key];
    if (value === void 0) {
      return Result4.fail(`Config key '${key}' is not defined`);
    }
    return Result4.ok(value);
  }
  /**
   * Cache'i temizler
   * Test senaryolarında veya runtime config değişikliklerinde kullanılır
   */
  clearCache() {
    this.cache.clear();
  }
  /**
   * Tüm konfigürasyonu log'lar (sensitive data maskelenir)
   */
  logConfig(sensitiveKeys = []) {
    const config = {};
    for (const key in process.env) {
      if (sensitiveKeys.includes(key)) {
        config[key] = "***MASKED***";
      } else {
        config[key] = process.env[key] || "";
      }
    }
    console.log("[AppConfig]: Current configuration:", config);
  }
};

// src/notifications/NotificationManager.ts
import { NotificationChannel, Result as Result5 } from "@ogza/core";
var NotificationManager = class {
  constructor(emailService, telegramService, smsService, whatsappService, webSocketService) {
    this.emailService = emailService;
    this.telegramService = telegramService;
    this.smsService = smsService;
    this.whatsappService = whatsappService;
    this.webSocketService = webSocketService;
  }
  async send(request) {
    switch (request.channel) {
      case NotificationChannel.EMAIL:
        if (!this.emailService) return Result5.fail("Email service not configured");
        return this.emailService.send(request);
      case NotificationChannel.TELEGRAM:
        if (!this.telegramService) return Result5.fail("Telegram service not configured");
        return this.telegramService.send(request);
      case NotificationChannel.SMS:
        if (!this.smsService) return Result5.fail("SMS service not configured");
        return this.smsService.send(request);
      case NotificationChannel.WHATSAPP:
        if (!this.whatsappService) return Result5.fail("WhatsApp service not configured");
        return this.whatsappService.send(request);
      case NotificationChannel.WEBSOCKET:
        if (!this.webSocketService) return Result5.fail("WebSocket service not configured");
        return this.webSocketService.send(request);
      default:
        return Result5.fail("Unsupported notification channel");
    }
  }
  async sendBatch(requests) {
    const promises = requests.map((req) => this.send(req));
    await Promise.all(promises);
    return Result5.ok();
  }
};

// src/notifications/email/providers/NodemailerProvider.ts
import * as nodemailer from "nodemailer";
import { Result as Result6 } from "@ogza/core";
var NodemailerProvider = class {
  constructor(config) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    });
  }
  async send(request) {
    try {
      await this.transporter.sendMail({
        from: this.config.defaultFrom,
        to: request.recipient,
        subject: request.subject,
        html: request.content,
        attachments: request.attachments
      });
      return Result6.ok();
    } catch (error) {
      console.error("Nodemailer Send Error:", error);
      return Result6.fail(`Email Error: ${error.message || "Unknown error"}`);
    }
  }
};

// src/notifications/email/EmailProviderFactory.ts
var EmailProviderFactory = class {
  static create(provider, config) {
    if (provider === "NODEMAILER") {
      return new NodemailerProvider(config);
    }
    throw new Error("Unsupported Email Provider");
  }
};

// src/notifications/sms/providers/TwilioSmsProvider.ts
import { Result as Result7 } from "@ogza/core";
import twilio from "twilio";
var TwilioSmsProvider = class {
  constructor(config) {
    this.config = config;
    this.client = twilio(config.accountSid, config.authToken);
  }
  async send(request) {
    try {
      await this.client.messages.create({
        body: request.content,
        from: this.config.fromNumber,
        to: request.phoneNumber
      });
      return Result7.ok();
    } catch (error) {
      console.error("Twilio SMS Send Error:", error);
      return Result7.fail(`SMS Error: ${error.message || "Unknown error"}`);
    }
  }
};

// src/notifications/sms/providers/NetGsmSmsProvider.ts
import { Result as Result8 } from "@ogza/core";
import axios from "axios";
var NetGsmSmsProvider = class {
  constructor(config) {
    this.config = config;
    this.apiUrl = config.apiUrl || "https://api.netgsm.com.tr/sms/send/get";
  }
  async send(request) {
    try {
      const params = {
        usercode: this.config.userCode,
        password: this.config.password,
        gsmno: this.normalizePhoneNumber(request.phoneNumber),
        message: request.content,
        msgheader: this.config.header
      };
      const response = await axios.get(this.apiUrl, { params });
      const responseCode = response.data.toString().trim();
      if (responseCode.startsWith("00") || responseCode.startsWith("01")) {
        return Result8.ok();
      }
      const errorMessage = this.parseErrorCode(responseCode);
      return Result8.fail(`NetGSM Error: ${errorMessage}`);
    } catch (error) {
      console.error("NetGSM SMS Send Error:", error);
      return Result8.fail(`SMS Error: ${error.message || "Unknown error"}`);
    }
  }
  /**
   * Telefon numarasını NetGSM formatına çevirir
   * Örnek: +905551234567 -> 5551234567
   */
  normalizePhoneNumber(phoneNumber) {
    let normalized = phoneNumber.replace(/[\s\-\(\)]/g, "");
    if (normalized.startsWith("+90")) {
      normalized = normalized.substring(3);
    } else if (normalized.startsWith("0090")) {
      normalized = normalized.substring(4);
    } else if (normalized.startsWith("90")) {
      normalized = normalized.substring(2);
    }
    if (normalized.startsWith("0")) {
      normalized = normalized.substring(1);
    }
    return normalized;
  }
  /**
   * NetGSM hata kodlarını anlamlandırır
   */
  parseErrorCode(code) {
    const errorCodes = {
      "20": "Mesaj metninde hata var",
      "30": "Ge\xE7ersiz kullan\u0131c\u0131 ad\u0131 veya \u015Fifre",
      "40": "Mesaj ba\u015Fl\u0131\u011F\u0131 (header) sisteme tan\u0131ml\u0131 de\u011Fil",
      "50": "Abone hesab\u0131n\u0131z ile ilgili bir problem var",
      "51": "Kredi yetersiz",
      "60": "G\xF6nderim s\u0131n\u0131r\u0131 a\u015F\u0131ld\u0131",
      "70": "Hatal\u0131 sorgulama",
      "80": "G\xF6nderilecek telefon numaras\u0131 hatal\u0131",
      "85": "Mesaj g\xF6nderim tarihi format\u0131 hatal\u0131"
    };
    return errorCodes[code] || `Bilinmeyen hata (${code})`;
  }
};

// src/notifications/sms/SmsProviderFactory.ts
var SmsProviderFactory = class {
  static create(providerType, config) {
    switch (providerType) {
      case "TWILIO":
        return new TwilioSmsProvider(config);
      case "NETGSM":
        return new NetGsmSmsProvider(config);
      default:
        throw new Error(`Desteklenmeyen SMS Sa\u011Flay\u0131c\u0131s\u0131: ${providerType}`);
    }
  }
};

// src/notifications/telegram/providers/TelegrafProvider.ts
import { Result as Result9 } from "@ogza/core";
import { Telegraf } from "telegraf";
var TelegrafProvider = class {
  constructor(config) {
    this.bot = new Telegraf(config.botToken);
  }
  async send(request) {
    try {
      await this.bot.telegram.sendMessage(request.chatId, request.message, {
        parse_mode: request.parseMode || void 0
      });
      return Result9.ok();
    } catch (error) {
      console.error("Telegraf Send Error:", error);
      return Result9.fail(`Telegram Error: ${error.message || "Unknown error"}`);
    }
  }
};

// src/notifications/telegram/TelegramProviderFactory.ts
var TelegramProviderFactory = class {
  static create(provider, config) {
    if (provider === "TELEGRAF") {
      return new TelegrafProvider(config);
    }
    throw new Error(`Bilinmeyen Telegram Sa\u011Flay\u0131c\u0131s\u0131: ${provider}`);
  }
};

// src/notifications/whatsapp/providers/TwilioWhatsappProvider.ts
import { Result as Result10 } from "@ogza/core";
import twilio2 from "twilio";
var TwilioWhatsappProvider = class {
  constructor(config) {
    this.config = config;
    this.client = twilio2(config.accountSid, config.authToken);
  }
  async send(request) {
    try {
      const fromNumber = this.formatWhatsAppNumber(this.config.fromNumber);
      const toNumber = this.formatWhatsAppNumber(request.phoneNumber);
      await this.client.messages.create({
        body: request.content,
        from: fromNumber,
        to: toNumber
      });
      return Result10.ok();
    } catch (error) {
      console.error("Twilio WhatsApp Send Error:", error);
      return Result10.fail(`WhatsApp Error: ${error.message || "Unknown error"}`);
    }
  }
  /**
   * Telefon numarasını Twilio WhatsApp formatına çevirir
   * Örnek: +1234567890 -> whatsapp:+1234567890
   */
  formatWhatsAppNumber(phoneNumber) {
    if (phoneNumber.startsWith("whatsapp:")) {
      return phoneNumber;
    }
    const normalized = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
    return `whatsapp:${normalized}`;
  }
};

// src/notifications/whatsapp/providers/MetaBusinessWhatsappProvider.ts
import { Result as Result11 } from "@ogza/core";
import axios2 from "axios";
var MetaBusinessWhatsappProvider = class {
  constructor(config) {
    this.config = config;
    const apiVersion = config.apiVersion || "v18.0";
    this.baseUrl = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`;
  }
  async send(request) {
    try {
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: this.normalizePhoneNumber(request.phoneNumber),
        type: "text",
        text: {
          preview_url: false,
          body: request.content
        }
      };
      const response = await axios2.post(this.baseUrl, payload, {
        headers: {
          "Authorization": `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json"
        }
      });
      if (response.data && response.data.messages) {
        return Result11.ok();
      }
      return Result11.fail("WhatsApp message send failed");
    } catch (error) {
      console.error("Meta WhatsApp Send Error:", error.response?.data || error);
      const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error";
      return Result11.fail(`WhatsApp Error: ${errorMessage}`);
    }
  }
  /**
   * Telefon numarasını Meta API formatına çevirir
   * + işareti olmadan, sadece rakamlar
   * Örnek: +905551234567 -> 905551234567
   */
  normalizePhoneNumber(phoneNumber) {
    return phoneNumber.replace(/[\s\-\(\)\+]/g, "");
  }
  /**
   * Template mesaj gönderimi için yardımcı metod
   * (Daha gelişmiş senaryolar için)
   */
  async sendTemplate(phoneNumber, templateName, languageCode = "en", components) {
    try {
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: this.normalizePhoneNumber(phoneNumber),
        type: "template",
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components: components || []
        }
      };
      const response = await axios2.post(this.baseUrl, payload, {
        headers: {
          "Authorization": `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json"
        }
      });
      if (response.data && response.data.messages) {
        return Result11.ok();
      }
      return Result11.fail("WhatsApp template send failed");
    } catch (error) {
      console.error("Meta WhatsApp Template Send Error:", error.response?.data || error);
      const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error";
      return Result11.fail(`WhatsApp Error: ${errorMessage}`);
    }
  }
};

// src/notifications/whatsapp/WhatsappProviderFactory.ts
var WhatsappProviderFactory = class {
  static create(provider, config) {
    switch (provider) {
      case "TWILIO":
        return new TwilioWhatsappProvider(config);
      case "META":
        return new MetaBusinessWhatsappProvider(config);
      default:
        throw new Error(`Bilinmeyen WhatsApp Sa\u011Flay\u0131c\u0131s\u0131: ${provider}`);
    }
  }
};

// src/cache/CacheFactory.ts
import { InMemoryAdapter, RedisAdapter } from "@ogza/core";
var CacheFactory = class {
  static create(config) {
    switch (config.provider) {
      case "MEMORY":
        return new InMemoryAdapter(
          config.prefix || "cache:",
          config.defaultTTL || 3600
        );
      case "REDIS":
        if (!config.redisClient) {
          throw new Error("Redis client is required for REDIS provider");
        }
        return new RedisAdapter(config.redisClient, {
          prefix: config.prefix,
          defaultTTL: config.defaultTTL,
          ...config.redisConfig
        });
      default:
        throw new Error(`Unsupported cache provider: ${config.provider}`);
    }
  }
};

// src/websocket/WebSocketFactory.ts
import {
  SocketIOServerAdapter,
  SocketIOClientAdapter,
  NativeWebSocketAdapter
} from "@ogza/core";
var WebSocketServerFactory = class {
  static create(provider, io, config) {
    switch (provider) {
      case "SOCKET_IO":
        return new SocketIOServerAdapter(io, config);
      default:
        throw new Error(`Unsupported WebSocket server provider: ${provider}`);
    }
  }
};
var WebSocketClientFactory = class {
  static create(provider, socket) {
    switch (provider) {
      case "SOCKET_IO":
        if (!socket) {
          throw new Error("Socket.IO client instance is required");
        }
        return new SocketIOClientAdapter(socket);
      case "NATIVE":
        return new NativeWebSocketAdapter();
      default:
        throw new Error(`Unsupported WebSocket client provider: ${provider}`);
    }
  }
};
export {
  AxiosHttpClient,
  BcryptHashingService,
  CacheFactory,
  EmailProviderFactory,
  EnvAppConfig,
  JwtTokenService,
  NodeEncryptionService,
  NodemailerProvider,
  NotificationManager,
  SmsProviderFactory,
  TelegrafProvider,
  TelegramProviderFactory,
  WebSocketClientFactory,
  WebSocketServerFactory,
  WhatsappProviderFactory
};
