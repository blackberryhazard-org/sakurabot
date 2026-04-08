import { LRUCache } from 'lru-cache'
import { cpus } from 'os'

const CPU_COUNT = cpus().length

const config = {
   // Starseed Configs
   ownerName: 'Lia Wynn',
   ownerNumber: 'WHATSAPP_PHONE_NUMBER',
   botName: 'Starseed',
   footer: '✦ Starseed',
   botNumber: 'WHATSAPP_PHONE_NUMBER',
   pairingCode: true,
   defaultLimit: 15,
   stickerPackName: '📦 Starseed Sticker',
   stickerPackPublisher: 'GitHub: itsliaaa',
   googleApiKey: '',
   apiUser: '',
   apiSecret: '',
   localTimezone: 'Asia/Jakarta',
   botThumbnail: './lib/Media/thumbnail.jpg',
   botMenuMusic: './lib/Media/music.mp3',
   temporaryFolder: 'temp',
   pluginsFolder: 'plugins',
   authFolder: 'session',
   storeFilename: 'store.json',
   databaseFilename: 'database.json',
   temporaryFileInterval: 1_000 * 60 * 30,
   dataInterval: 1_000 * 60 * 10,
   gcInterval: 1_000 * 60 * 60,
   requestTimeout: 1_000 * 60 * 1.5,
   ffmpegTimeout: 1_000 * 60,
   minDelay: 100,
   maxDelay: 1_000 * 3,
   ignoreOldMessageTS: 30,
   rssLimit: 1_024 * 1_024 * 384,
   ffmpegConcurrency: Math.max(4, Math.floor(CPU_COUNT * 1.3)),
   maxNSFWScore: 0.75,
   maxHistoryChatSize: 20,
   ResultCache: new LRUCache({
      max: 1_024,
      ttl: 1_000 * 60 * 1.5,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
      ttlAutopurge: true
   }),

   // Sakurabot Additions
   tgbot: {
       name: "BOT_NAME",
       botfatherToken: "BOTFATHER_TOKEN",
       newsletterId: "TELEGRAM_NEWSLETTER_ID"
   },
   system: {
       port: 5000,
       useServer: true
   }
};

Object.assign(global, config);

export default config;
