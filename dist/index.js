"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AxiosHttpClient: () => AxiosHttpClient,
  BcryptHashingService: () => BcryptHashingService,
  CacheFactory: () => CacheFactory,
  EmailProviderFactory: () => EmailProviderFactory,
  EnvAppConfig: () => EnvAppConfig,
  JwtTokenService: () => JwtTokenService,
  NodeEncryptionService: () => NodeEncryptionService,
  NodemailerProvider: () => NodemailerProvider,
  NotificationManager: () => NotificationManager,
  SmsProviderFactory: () => SmsProviderFactory,
  TelegrafProvider: () => TelegrafProvider,
  TelegramProviderFactory: () => TelegramProviderFactory,
  WebSocketClientFactory: () => WebSocketClientFactory,
  WebSocketServerFactory: () => WebSocketServerFactory,
  WhatsappProviderFactory: () => WhatsappProviderFactory
});
module.exports = __toCommonJS(index_exports);

// src/http/AxiosHttpClient.ts
var import_axios = __toESM(require("axios"));
var import_core = require("@ogza/core");
var AxiosHttpClient = class {
  constructor(config, encryptionService, tokenProvider) {
    this.client = import_axios.default.create({
      timeout: 3e4,
      // Default 30s timeout
      ...config
    });
    this.encryptionService = encryptionService;
    this.tokenProvider = tokenProvider;
    this.initializeInterceptors();
  }
  /**
   * Token provider'ı runtime'da set etmek için
   * Özellikle login sonrası token güncellemelerinde kullanılır
   */
  setAuthTokenProvider(provider) {
    this.tokenProvider = provider;
  }
  /**
   * Tüm interceptor'ları sırayla başlat
   * Sıralama önemli: Token -> Encryption -> Response handling
   */
  initializeInterceptors() {
    this.addTokenMiddleware();
    this.addEncryptionMiddleware();
    this.addResponseMiddleware();
  }
  /**
   * REQUEST INTERCEPTOR 1: Token Injection
   * Her istekte otomatik olarak Authorization header'ı ekler
   */
  addTokenMiddleware() {
    this.client.interceptors.request.use((config) => {
      if (!this.tokenProvider) return config;
      const token = this.tokenProvider();
      if (token && config.headers) {
        this.setHeader(config.headers, "Authorization", `Bearer ${token}`);
      }
      return config;
    });
  }
  /**
   * REQUEST/RESPONSE INTERCEPTOR 2: Encryption
   * x-encrypt header'ı varsa request body'yi şifreler
   * x-encrypted header'ı varsa response'u deşifreler
   */
  addEncryptionMiddleware() {
    this.client.interceptors.request.use(async (config) => {
      if (!this.encryptionService || !config.headers) return config;
      const shouldEncrypt = this.getHeader(config.headers, "x-encrypt") === "true";
      if (shouldEncrypt) {
        this.deleteHeader(config.headers, "x-encrypt");
        if (config.data) {
          const stringBody = JSON.stringify(config.data);
          const encryptedResult = await this.encryptionService.encrypt(stringBody);
          if (encryptedResult.isFailure) {
            throw new Error(encryptedResult.error || import_core.LocalizationService.t(import_core.CoreKeys.INFRA.ENCRYPTION_FAILED));
          }
          config.data = { payload: encryptedResult.getValue() };
        }
      }
      return config;
    });
    this.client.interceptors.response.use(async (response) => {
      const isEncrypted = response.headers["x-encrypted"] === "true";
      if (this.encryptionService && isEncrypted && response.data?.payload) {
        const decryptedResult = await this.encryptionService.decrypt(response.data.payload);
        if (decryptedResult.isFailure) {
          throw new Error(decryptedResult.error || import_core.LocalizationService.t(import_core.CoreKeys.INFRA.DECRYPTION_FAILED));
        }
        try {
          response.data = JSON.parse(decryptedResult.getValue());
        } catch {
          response.data = decryptedResult.getValue();
        }
      }
      return response;
    });
  }
  /**
   * RESPONSE INTERCEPTOR 3: Error Handling
   * Hataları yakalayıp Promise.reject ile fırlatır
   * Asıl error mapping handleAxiosError'da yapılır
   */
  addResponseMiddleware() {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error)
    );
  }
  /**
   * Ana HTTP request metodu
   * Tüm HTTP metodları (GET, POST, PUT, DELETE) buradan geçer
   */
  async request(options) {
    try {
      const axiosConfig = {
        url: options.url,
        method: options.method,
        data: options.body,
        headers: options.headers,
        params: options.params,
        timeout: options.timeout
      };
      const response = await this.client.request(axiosConfig);
      return import_core.Result.ok(this.mapResponse(response));
    } catch (error) {
      return this.handleAxiosError(error);
    }
  }
  /**
   * Axios response'unu IHttpResponse'a map eder
   */
  mapResponse(response) {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    };
  }
  /**
   * Axios hatalarını domain error'larına çevirir
   * HTTP status code'lara göre uygun error türü döner
   */
  handleAxiosError(error) {
    if (!import_axios.default.isAxiosError(error)) {
      return import_core.Result.fail(import_core.LocalizationService.t(import_core.CoreKeys.INFRA.NETWORK_ERROR));
    }
    const axiosError = error;
    if (axiosError.response) {
      return this.handleResponseError(axiosError.response);
    }
    if (axiosError.request) {
      return this.handleRequestError(axiosError);
    }
    return import_core.Result.fail(import_core.LocalizationService.t(import_core.CoreKeys.INFRA.NETWORK_ERROR));
  }
  /**
   * HTTP response error'larını işler (4xx, 5xx)
   */
  handleResponseError(response) {
    const status = response.status;
    const data = response.data;
    const serverMessage = data?.error?.message || data?.message || response.statusText;
    switch (status) {
      case 400:
        return import_core.Result.fail(new import_core.ValidationError(serverMessage).message);
      case 401:
        return import_core.Result.fail(new import_core.UnauthorizedError(serverMessage).message);
      case 403:
        return import_core.Result.fail(new import_core.ForbiddenError(serverMessage).message);
      case 404:
        return import_core.Result.fail(new import_core.NotFoundError(serverMessage || "Resource").message);
      case 503:
        return import_core.Result.fail(new import_core.ServiceUnavailableError(serverMessage).message);
      default:
        return import_core.Result.fail(new import_core.UnexpectedError(serverMessage || `HTTP ${status}`).message);
    }
  }
  /**
   * Network error'larını işler (timeout, connection refused, vb.)
   */
  handleRequestError(error) {
    if (error.code === "ECONNABORTED") {
      return import_core.Result.fail(import_core.LocalizationService.t(import_core.CoreKeys.INFRA.TIMEOUT_ERROR));
    }
    return import_core.Result.fail(import_core.LocalizationService.t(import_core.CoreKeys.INFRA.NETWORK_ERROR));
  }
  /**
   * Type-safe header getter
   * AxiosHeaders class'ı veya plain object her ikisini de destekler
   */
  getHeader(headers, key) {
    if (headers instanceof import_axios.AxiosHeaders) {
      return headers.get(key);
    }
    return headers[key] || null;
  }
  /**
   * Type-safe header setter
   */
  setHeader(headers, key, value) {
    if (headers instanceof import_axios.AxiosHeaders) {
      headers.set(key, value);
    } else {
      headers[key] = value;
    }
  }
  /**
   * Type-safe header deleter
   */
  deleteHeader(headers, key) {
    if (headers instanceof import_axios.AxiosHeaders) {
      headers.delete(key);
    } else {
      delete headers[key];
    }
  }
  // ==================== CONVENIENCE METHODS ====================
  async get(url, params, headers) {
    return this.request({ url, method: "GET", params, headers });
  }
  async post(url, body, headers) {
    return this.request({ url, method: "POST", body, headers });
  }
  async put(url, body, headers) {
    return this.request({ url, method: "PUT", body, headers });
  }
  async delete(url, headers) {
    return this.request({ url, method: "DELETE", headers });
  }
  async patch(url, body, headers) {
    return this.request({ url, method: "PATCH", body, headers });
  }
};

// src/crypto/NodeEncryptionService.ts
var crypto = __toESM(require("crypto"));
var import_core2 = require("@ogza/core");
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
      return import_core2.Result.ok(`${iv.toString("hex")}:${encrypted}`);
    } catch (err) {
      const msg = import_core2.LocalizationService.t(import_core2.CoreKeys.INFRA.ENCRYPTION_FAILED);
      return import_core2.Result.fail(`${msg}: ${err.message}`);
    }
  }
  async decrypt(cipherText) {
    try {
      const textParts = cipherText.split(":");
      if (textParts.length !== 2) {
        return import_core2.Result.fail(import_core2.LocalizationService.t(import_core2.CoreKeys.INFRA.INVALID_CIPHER_FORMAT));
      }
      const iv = Buffer.from(textParts[0], "hex");
      const encryptedText = Buffer.from(textParts[1], "hex");
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return import_core2.Result.ok(decrypted.toString());
    } catch (err) {
      const msg = import_core2.LocalizationService.t(import_core2.CoreKeys.INFRA.DECRYPTION_FAILED);
      return import_core2.Result.fail(`${msg}: ${err.message}`);
    }
  }
};

// src/crypto/BcryptHashingService.ts
var bcrypt = __toESM(require("bcrypt"));
var import_core3 = require("@ogza/core");
var BcryptHashingService = class {
  constructor() {
    this.saltRounds = 10;
  }
  async hash(plainText) {
    try {
      const hashed = await bcrypt.hash(plainText, this.saltRounds);
      return import_core3.Result.ok(hashed);
    } catch (err) {
      const msg = import_core3.LocalizationService.t(import_core3.CoreKeys.INFRA.HASHING_FAILED);
      return import_core3.Result.fail(`${msg}: ${err.message}`);
    }
  }
  async compare(plainText, hashedValue) {
    console.log("BcryptHashingService Compare Method");
    try {
      console.log(plainText);
      console.log(hashedValue);
      const match = await bcrypt.compare(plainText, hashedValue);
      console.log("BcryptHashingService Compare Method - Match %s", match);
      return import_core3.Result.ok(match);
    } catch (err) {
      const msg = import_core3.LocalizationService.t(import_core3.CoreKeys.INFRA.HASHING_FAILED);
      console.log(`${msg}: ${err.message}`);
      return import_core3.Result.fail(`${msg}: ${err.message}`);
    }
  }
};

// src/auth/JwtTokenService.ts
var jwt = __toESM(require("jsonwebtoken"));
var import_core4 = require("@ogza/core");
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
      return import_core4.Result.ok(token);
    } catch (err) {
      return import_core4.Result.fail(`Token signing failed: ${err.message}`);
    }
  }
  async verify(token) {
    try {
      const decoded = jwt.verify(token, this.secretKey);
      return import_core4.Result.ok(decoded);
    } catch (err) {
      return import_core4.Result.fail(import_core4.LocalizationService.t(import_core4.CoreKeys.ERRORS.UNAUTHORIZED));
    }
  }
  decode(token) {
    try {
      const decoded = jwt.decode(token);
      return import_core4.Result.ok(decoded);
    } catch (err) {
      return import_core4.Result.fail(`Token decoding failed: ${err.message}`);
    }
  }
};

// src/config/EnvAppConfig.ts
var import_core5 = require("@ogza/core");
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
      return import_core5.Result.fail(`Config key '${key}' is not defined`);
    }
    return import_core5.Result.ok(value);
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
var import_core6 = require("@ogza/core");
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
      case import_core6.NotificationChannel.EMAIL:
        if (!this.emailService) return import_core6.Result.fail("Email service not configured");
        return this.emailService.send(request);
      case import_core6.NotificationChannel.TELEGRAM:
        if (!this.telegramService) return import_core6.Result.fail("Telegram service not configured");
        return this.telegramService.send(request);
      case import_core6.NotificationChannel.SMS:
        if (!this.smsService) return import_core6.Result.fail("SMS service not configured");
        return this.smsService.send(request);
      case import_core6.NotificationChannel.WHATSAPP:
        if (!this.whatsappService) return import_core6.Result.fail("WhatsApp service not configured");
        return this.whatsappService.send(request);
      case import_core6.NotificationChannel.WEBSOCKET:
        if (!this.webSocketService) return import_core6.Result.fail("WebSocket service not configured");
        return this.webSocketService.send(request);
      default:
        return import_core6.Result.fail("Unsupported notification channel");
    }
  }
  async sendBatch(requests) {
    const promises = requests.map((req) => this.send(req));
    await Promise.all(promises);
    return import_core6.Result.ok();
  }
};

// src/notifications/email/providers/NodemailerProvider.ts
var nodemailer = __toESM(require("nodemailer"));
var import_core7 = require("@ogza/core");
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
      return import_core7.Result.ok();
    } catch (error) {
      console.error("Nodemailer Send Error:", error);
      return import_core7.Result.fail(`Email Error: ${error.message || "Unknown error"}`);
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
var import_core8 = require("@ogza/core");
var import_twilio = __toESM(require("twilio"));
var TwilioSmsProvider = class {
  constructor(config) {
    this.config = config;
    this.client = (0, import_twilio.default)(config.accountSid, config.authToken);
  }
  async send(request) {
    try {
      await this.client.messages.create({
        body: request.content,
        from: this.config.fromNumber,
        to: request.phoneNumber
      });
      return import_core8.Result.ok();
    } catch (error) {
      console.error("Twilio SMS Send Error:", error);
      return import_core8.Result.fail(`SMS Error: ${error.message || "Unknown error"}`);
    }
  }
};

// src/notifications/sms/providers/NetGsmSmsProvider.ts
var import_core9 = require("@ogza/core");
var import_axios2 = __toESM(require("axios"));
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
      const response = await import_axios2.default.get(this.apiUrl, { params });
      const responseCode = response.data.toString().trim();
      if (responseCode.startsWith("00") || responseCode.startsWith("01")) {
        return import_core9.Result.ok();
      }
      const errorMessage = this.parseErrorCode(responseCode);
      return import_core9.Result.fail(`NetGSM Error: ${errorMessage}`);
    } catch (error) {
      console.error("NetGSM SMS Send Error:", error);
      return import_core9.Result.fail(`SMS Error: ${error.message || "Unknown error"}`);
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
var import_core10 = require("@ogza/core");
var import_telegraf = require("telegraf");
var TelegrafProvider = class {
  constructor(config) {
    this.bot = new import_telegraf.Telegraf(config.botToken);
  }
  async send(request) {
    try {
      await this.bot.telegram.sendMessage(request.chatId, request.message, {
        parse_mode: request.parseMode || void 0
      });
      return import_core10.Result.ok();
    } catch (error) {
      console.error("Telegraf Send Error:", error);
      return import_core10.Result.fail(`Telegram Error: ${error.message || "Unknown error"}`);
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
var import_core11 = require("@ogza/core");
var import_twilio2 = __toESM(require("twilio"));
var TwilioWhatsappProvider = class {
  constructor(config) {
    this.config = config;
    this.client = (0, import_twilio2.default)(config.accountSid, config.authToken);
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
      return import_core11.Result.ok();
    } catch (error) {
      console.error("Twilio WhatsApp Send Error:", error);
      return import_core11.Result.fail(`WhatsApp Error: ${error.message || "Unknown error"}`);
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
var import_core12 = require("@ogza/core");
var import_axios3 = __toESM(require("axios"));
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
      const response = await import_axios3.default.post(this.baseUrl, payload, {
        headers: {
          "Authorization": `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json"
        }
      });
      if (response.data && response.data.messages) {
        return import_core12.Result.ok();
      }
      return import_core12.Result.fail("WhatsApp message send failed");
    } catch (error) {
      console.error("Meta WhatsApp Send Error:", error.response?.data || error);
      const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error";
      return import_core12.Result.fail(`WhatsApp Error: ${errorMessage}`);
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
      const response = await import_axios3.default.post(this.baseUrl, payload, {
        headers: {
          "Authorization": `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json"
        }
      });
      if (response.data && response.data.messages) {
        return import_core12.Result.ok();
      }
      return import_core12.Result.fail("WhatsApp template send failed");
    } catch (error) {
      console.error("Meta WhatsApp Template Send Error:", error.response?.data || error);
      const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error";
      return import_core12.Result.fail(`WhatsApp Error: ${errorMessage}`);
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
var import_core13 = require("@ogza/core");
var CacheFactory = class {
  static create(config) {
    switch (config.provider) {
      case "MEMORY":
        return new import_core13.InMemoryAdapter(
          config.prefix || "cache:",
          config.defaultTTL || 3600
        );
      case "REDIS":
        if (!config.redisClient) {
          throw new Error("Redis client is required for REDIS provider");
        }
        return new import_core13.RedisAdapter(config.redisClient, {
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
var import_core14 = require("@ogza/core");
var WebSocketServerFactory = class {
  static create(provider, io, config) {
    switch (provider) {
      case "SOCKET_IO":
        return new import_core14.SocketIOServerAdapter(io, config);
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
        return new import_core14.SocketIOClientAdapter(socket);
      case "NATIVE":
        return new import_core14.NativeWebSocketAdapter();
      default:
        throw new Error(`Unsupported WebSocket client provider: ${provider}`);
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
