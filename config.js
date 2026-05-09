import { LRUCache } from "lru-cache";
import { cpus } from "os";

const CPU_COUNT = cpus().length;

const wabot = {
  ownerName: "OWNER_NAME",
  ownerNumber: "OWNER_NUMBER",
  botName: "BOT_NAME",
  footer: "✦ Sakurabot",
  botNumber: "BOT_NUMBER",
  pairingCode: true,
  defaultLimit: 15,
  stickerPackName: "📦 Sakurabot Sticker",
  stickerPackPublisher: "GitHub: indra87g",
  apiUser: "",
  apiSecret: "",
  localTimezone: "Asia/Jakarta",
  botThumbnail: "./media/Image/thumbnail.jpg",
  botMenuMusic: "./media/Audio/music.mp3",
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
    ttlAutopurge: true,
  }),
};

const tgbot = {
  ownerId: "OWNER_ID",
  newsletterId: "NEWSLETTER_ID",
  botname: "BOT_NAME",
  botfatherToken: "BOTFATHER_TOKEN",
};

const misc = {
  pluginsFolder: "wa/plugins",
  geminiApiKey: "GEMINI_APIKEY",
};

export default { wabot, tgbot, misc };
