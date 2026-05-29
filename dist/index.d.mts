export { A as AxiosHttpClient } from './AxiosHttpClient-D7UXpHsu.mjs';
import { IEncryptionService, Result, IHashingService, ITokenService, ITokenPayload, IAppConfig, INotificationService, IEmailService, ITelegramService, ISmsService, IWhatsappService, IWebSocketService, INotificationRequest, IEmailNotification, ITelegramNotification, RedisConfig, ICache, IWebSocketClient, WebSocketConfig, IWebSocketServer } from '@ogza/core';
import 'axios';

declare class NodeEncryptionService implements IEncryptionService {
    private readonly algorithm;
    private readonly key;
    private readonly ivLength;
    constructor(secretKey: string);
    encrypt(plainText: string): Promise<Result<string>>;
    decrypt(cipherText: string): Promise<Result<string>>;
}

declare class BcryptHashingService implements IHashingService {
    private readonly saltRounds;
    hash(plainText: string): Promise<Result<string>>;
    compare(plainText: string, hashedValue: string): Promise<Result<boolean>>;
}

declare class JwtTokenService implements ITokenService {
    private readonly secretKey;
    private readonly defaultExpiresIn;
    constructor(secretKey: string, defaultExpiresIn?: string | number);
    sign(payload: ITokenPayload, expiresIn?: string | number): Promise<Result<string>>;
    verify(token: string): Promise<Result<ITokenPayload>>;
    decode(token: string): Result<ITokenPayload | null>;
}

declare class EnvAppConfig implements IAppConfig {
    private readonly validateOnInit;
    private readonly requiredKeys;
    private readonly cache;
    constructor(requiredKeys?: string[], validateOnInit?: boolean);
    private validateRequiredKeys;
    get(key: string, defaultValue?: string): string;
    getNumber(key: string, defaultValue?: number): number;
    getBoolean(key: string, defaultValue?: boolean): boolean;
    isProduction(): boolean;
    isDevelopment(): boolean;
    isTest(): boolean;
    has(key: string): boolean;
    getMany(keys: string[]): Record<string, string>;
    getByPrefix(prefix: string): Record<string, string>;
    getSafe(key: string): Result<string>;
    clearCache(): void;
    logConfig(sensitiveKeys?: string[]): void;
}

declare class NotificationManager implements INotificationService {
    private emailService?;
    private telegramService?;
    private smsService?;
    private whatsappService?;
    private webSocketService?;
    constructor(emailService?: IEmailService | undefined, telegramService?: ITelegramService | undefined, smsService?: ISmsService | undefined, whatsappService?: IWhatsappService | undefined, webSocketService?: IWebSocketService | undefined);
    send(request: INotificationRequest): Promise<Result<void>>;
    sendBatch(requests: INotificationRequest[]): Promise<Result<void>>;
}

interface NodemailerConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    defaultFrom: string;
}
declare class NodemailerProvider implements IEmailService {
    private transporter;
    private config;
    constructor(config: NodemailerConfig);
    send(request: IEmailNotification): Promise<Result<void>>;
}

declare class EmailProviderFactory {
    static create(provider: 'NODEMAILER', config: NodemailerConfig): IEmailService;
}

interface TwilioSmsConfig {
    accountSid: string;
    authToken: string;
    fromNumber: string;
}

interface NetGsmConfig {
    userCode: string;
    password: string;
    header: string;
    apiUrl?: string;
}

declare class SmsProviderFactory {
    static create(providerType: 'TWILIO' | 'NETGSM', config: TwilioSmsConfig | NetGsmConfig): ISmsService;
}

interface TelegrafConfig {
    botToken: string;
}
declare class TelegrafProvider implements ITelegramService {
    private bot;
    constructor(config: TelegrafConfig);
    send(request: ITelegramNotification): Promise<Result<void>>;
}

declare class TelegramProviderFactory {
    static create(provider: 'TELEGRAF', config: TelegrafConfig): ITelegramService;
}

interface TwilioWhatsappConfig {
    accountSid: string;
    authToken: string;
    fromNumber: string;
}

interface MetaBusinessWhatsappConfig {
    phoneNumberId: string;
    accessToken: string;
    apiVersion?: string;
}

declare class WhatsappProviderFactory {
    static create(provider: 'TWILIO' | 'META', config: TwilioWhatsappConfig | MetaBusinessWhatsappConfig): IWhatsappService;
}

type CacheProvider = 'MEMORY' | 'REDIS';
interface CacheFactoryConfig {
    provider: CacheProvider;
    prefix?: string;
    defaultTTL?: number;
    redisClient?: any;
    redisConfig?: RedisConfig;
}
declare class CacheFactory {
    static create(config: CacheFactoryConfig): ICache;
}

type WebSocketServerProvider = 'SOCKET_IO';
type WebSocketClientProvider = 'SOCKET_IO' | 'NATIVE';
declare class WebSocketServerFactory {
    static create(provider: WebSocketServerProvider, io: any, config?: WebSocketConfig): IWebSocketServer;
}
declare class WebSocketClientFactory {
    static create(provider: WebSocketClientProvider, socket?: any): IWebSocketClient;
}

export { BcryptHashingService, CacheFactory, type CacheFactoryConfig, type CacheProvider, EmailProviderFactory, EnvAppConfig, JwtTokenService, NodeEncryptionService, type NodemailerConfig, NodemailerProvider, NotificationManager, SmsProviderFactory, type TelegrafConfig, TelegrafProvider, TelegramProviderFactory, WebSocketClientFactory, type WebSocketClientProvider, WebSocketServerFactory, type WebSocketServerProvider, WhatsappProviderFactory };
