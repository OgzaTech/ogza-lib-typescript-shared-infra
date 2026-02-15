# ogza-lib-typescript-shared-infra
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