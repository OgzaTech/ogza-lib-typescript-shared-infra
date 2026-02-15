# @ogza/shared-infra

Production-ready infrastructure layer for TypeScript applications following DDD (Domain-Driven Design) principles.

## 📦 Installation
```bash
npm install @ogza/shared-infra @ogza/core
```

## 🏗️ Architecture

This package provides infrastructure implementations for:

- **HTTP Client** - Axios-based HTTP client with encryption, token injection, and error handling
- **Authentication** - JWT token management
- **Encryption & Hashing** - AES-256-CBC encryption and Bcrypt hashing
- **Configuration** - Environment variable management
- **Notifications** - Multi-channel notification system (Email, SMS, WhatsApp, Telegram)
- **Browser Adapters** - localStorage, sessionStorage, and Cookie management

---

## 🚀 Quick Start

### HTTP Client with Encryption
```typescript
import { AxiosHttpClient, NodeEncryptionService } from '@ogza/shared-infra';

// Setup encryption
const encryption = new NodeEncryptionService('your-secret-key');

// Create HTTP client
const httpClient = new AxiosHttpClient(
  { baseURL: 'https://api.example.com' },
  encryption,
  () => localStorage.getItem('token') // Token provider
);

// Make requests
const result = await httpClient.post('/users', { name: 'John' });

if (result.isSuccess) {
  console.log(result.getValue().data);
}

// Encrypted request
await httpClient.post(
  '/sensitive-data',
  { secret: 'data' },
  { 'x-encrypt': 'true' }
);
```

### JWT Authentication
```typescript
import { JwtTokenService } from '@ogza/shared-infra';

const jwtService = new JwtTokenService('your-secret-key', '1h');

// Sign token
const payload = {
  id: 'token-1',
  userId: 'user-123',
  email: 'user@example.com',
  roles: ['admin']
};

const tokenResult = await jwtService.sign(payload);
const token = tokenResult.getValue();

// Verify token
const verifyResult = await jwtService.verify(token);
if (verifyResult.isSuccess) {
  console.log(verifyResult.getValue().userId); // 'user-123'
}

// Decode without verification
const decoded = jwtService.decode(token);
```

### Multi-Channel Notifications
```typescript
import {
  NotificationManager,
  EmailProviderFactory,
  SmsProviderFactory,
  TelegramProviderFactory,
  WhatsappProviderFactory
} from '@ogza/shared-infra';

// Setup providers
const emailService = EmailProviderFactory.create('NODEMAILER', {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user: 'your@email.com', pass: 'password' },
  defaultFrom: 'noreply@example.com'
});

const smsService = SmsProviderFactory.create('TWILIO', {
  accountSid: 'your-sid',
  authToken: 'your-token',
  fromNumber: '+1234567890'
});

const telegramService = TelegramProviderFactory.create('TELEGRAF', {
  botToken: 'your-bot-token'
});

const whatsappService = WhatsappProviderFactory.create('META', {
  phoneNumberId: 'your-phone-id',
  accessToken: 'your-access-token'
});

// Create notification manager
const notificationManager = new NotificationManager(
  emailService,
  telegramService,
  smsService,
  whatsappService
);

// Send notifications
await notificationManager.send({
  channel: 'EMAIL',
  recipient: 'user@example.com',
  subject: 'Welcome!',
  content: '<h1>Welcome to our app!</h1>',
  attachments: []
});

await notificationManager.send({
  channel: 'SMS',
  phoneNumber: '+905551234567',
  message: 'Your verification code: 123456'
});

await notificationManager.send({
  channel: 'TELEGRAM',
  chatId: '123456789',
  message: 'Alert: System update completed',
  parseMode: 'HTML'
});

await notificationManager.send({
  channel: 'WHATSAPP',
  phoneNumber: '+905551234567',
  message: 'Your order has been shipped!'
});

// Send batch notifications
await notificationManager.sendBatch([
  { channel: 'EMAIL', recipient: 'user1@example.com', subject: 'Hi', content: 'Hello', attachments: [] },
  { channel: 'SMS', phoneNumber: '+905551234567', message: 'Code: 123' }
]);
```

### Configuration Management
```typescript
import { EnvAppConfig } from '@ogza/shared-infra';

// Create config with required keys
const config = new EnvAppConfig(
  ['DATABASE_URL', 'JWT_SECRET', 'API_KEY'],
  true // Validate on initialization
);

// Get values
const dbUrl = config.get('DATABASE_URL');
const port = config.getNumber('PORT', 3000);
const isDebug = config.getBoolean('DEBUG', false);

// Check environment
if (config.isProduction()) {
  console.log('Running in production');
}

// Get multiple keys
const credentials = config.getMany(['API_KEY', 'API_SECRET']);

// Get by prefix
const appSettings = config.getByPrefix('APP_');

// Safe get with Result pattern
const apiKeyResult = config.getSafe('API_KEY');
if (apiKeyResult.isSuccess) {
  console.log(apiKeyResult.getValue());
}

// Clear cache (useful for testing)
config.clearCache();

// Log config (masks sensitive keys)
config.logConfig(['API_KEY', 'DATABASE_URL', 'JWT_SECRET']);
```

### Encryption & Hashing
```typescript
import { NodeEncryptionService, BcryptHashingService } from '@ogza/shared-infra';

// AES-256-CBC Encryption
const encryption = new NodeEncryptionService('your-secret-key');

const encryptResult = await encryption.encrypt('sensitive data');
const encrypted = encryptResult.getValue(); // "iv:ciphertext"

const decryptResult = await encryption.decrypt(encrypted);
const decrypted = decryptResult.getValue(); // "sensitive data"

// Bcrypt Password Hashing
const hashing = new BcryptHashingService();

const hashResult = await hashing.hash('myPassword123');
const hash = hashResult.getValue();

const matchResult = await hashing.compare('myPassword123', hash);
console.log(matchResult.getValue()); // true

const wrongResult = await hashing.compare('wrongPassword', hash);
console.log(wrongResult.getValue()); // false
```

### Browser Adapters (Web Client)
```typescript
import { WebStorageAdapter, WebCookieAdapter } from '@ogza/shared-infra/web';

// localStorage/sessionStorage
const storage = new WebStorageAdapter(); // Default: localStorage
// const storage = new WebStorageAdapter(sessionStorage);

storage.set('user', { id: 1, name: 'John' });
const user = storage.get<{ id: number; name: string }>('user');
storage.remove('user');
storage.clear();

// Cookies
const cookies = new WebCookieAdapter();

cookies.set('token', 'abc123', {
  expires: 7, // 7 days
  path: '/',
  secure: true
});

const token = cookies.get('token');
cookies.remove('token');
```

---

## 📚 Provider Options

### SMS Providers

#### Twilio SMS
```typescript
SmsProviderFactory.create('TWILIO', {
  accountSid: 'your-account-sid',
  authToken: 'your-auth-token',
  fromNumber: '+1234567890'
});
```

#### NetGSM (Turkey)
```typescript
SmsProviderFactory.create('NETGSM', {
  userCode: 'your-user-code',
  password: 'your-password',
  header: 'YOUR_HEADER',
  apiUrl: 'https://api.netgsm.com.tr/sms/send/get' // Optional
});
```

### WhatsApp Providers

#### Twilio WhatsApp
```typescript
WhatsappProviderFactory.create('TWILIO', {
  accountSid: 'your-account-sid',
  authToken: 'your-auth-token',
  fromNumber: 'whatsapp:+14155238886'
});
```

#### Meta Business WhatsApp
```typescript
WhatsappProviderFactory.create('META', {
  phoneNumberId: 'your-phone-number-id',
  accessToken: 'your-access-token',
  apiVersion: 'v18.0' // Optional
});
```

### Email Providers

#### Nodemailer (SMTP)
```typescript
EmailProviderFactory.create('NODEMAILER', {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  },
  defaultFrom: 'noreply@example.com'
});
```

### Telegram Providers

#### Telegraf
```typescript
TelegramProviderFactory.create('TELEGRAF', {
  botToken: 'your-bot-token'
});
```

---

## 🧪 Testing
```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

---

## 🏭 Build
```bash
# Build for production
npm run build

# Watch mode
npm run dev
```

---

## 📁 Package Exports
```typescript
// Main export (Node.js)
import { AxiosHttpClient, JwtTokenService, ... } from '@ogza/shared-infra';

// Web client export (Browser)
import { WebStorageAdapter, WebCookieAdapter } from '@ogza/shared-infra/web';
```

---

## 🔒 Security Features

- **AES-256-CBC Encryption** with random IV
- **Bcrypt Password Hashing** with salt rounds
- **JWT Token Management** with expiry
- **Automatic Token Injection** in HTTP requests
- **Request/Response Encryption** middleware
- **Secure Cookie Options** (httpOnly, secure, sameSite)

---

## 🎯 Best Practices

### Error Handling
All methods return `Result<T>` pattern:
```typescript
const result = await httpClient.get('/users');

if (result.isSuccess) {
  const data = result.getValue();
  console.log(data);
} else {
  console.error(result.error);
}
```

### Dependency Injection
```typescript
class UserService {
  constructor(
    private httpClient: IHttpClient,
    private jwtService: ITokenService,
    private notificationService: INotificationService
  ) {}
}

// DI Container
const userService = new UserService(
  httpClient,
  jwtService,
  notificationManager
);
```

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://localhost:5432/mydb

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=1h

# Twilio
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1234567890

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-password
SMTP_FROM=noreply@example.com

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF

# Meta WhatsApp
META_PHONE_NUMBER_ID=123456789
META_ACCESS_TOKEN=EAAxxxx

# Encryption
ENCRYPTION_SECRET_KEY=your-encryption-key
```

---

## 📝 TypeScript Support

Full TypeScript support with type definitions:
```typescript
import type {
  IHttpClient,
  ITokenService,
  IEncryptionService,
  INotificationService
} from '@ogza/core';
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT

---

## 🔗 Related Packages

- [@ogza/core](https://github.com/OgzaTech/ogza-lib-typescript-core) - Core domain models and interfaces

---

## 📞 Support

- 🐛 [Report Bug](https://github.com/OgzaTech/ogza-lib-typescript-shared-infra/issues)
- 💡 [Request Feature](https://github.com/OgzaTech/ogza-lib-typescript-shared-infra/issues)
- 📧 Email: support@ogza.tech

---

**Built with ❤️ by OgzaTech**

packages/shared-infra/src/
├── http/
│   └── AxiosHttpClient.ts   <-- IHttpClient implementasyonu
├── crypto/
│   └── BcryptHashingService.ts <-- (Sadece Node.js için)
└── index.ts

Notifaiton yapısı 

packages/shared-infra/src/notifications/
├── sms/
│   ├── providers/
│   │   ├── TwilioSmsProvider.ts
│   │   └── NetgsmSmsProvider.ts
│   └── SmsProviderFactory.ts
│
├── whatsapp/
│   ├── providers/
│   │   ├── TwilioWhatsappProvider.ts     <-- Twilio API kullanır
│   │   └── MetaBusinessProvider.ts       <-- Direkt Facebook API kullanır
│   └── WhatsappProviderFactory.ts
│
├── telegram/
│   ├── providers/
│   │   ├── TelegrafProvider.ts           <-- Telegraf kütüphanesi
│   │   └── RawHttpProvider.ts            <-- Düz Axios isteği
│   └── TelegramProviderFactory.ts