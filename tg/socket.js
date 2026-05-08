import { Telegraf } from "telegraf";
import fs from "fs/promises";
import path from "path";

import { TelegramDatabase } from "../lib/TelegramDatabase.js";

const dbFile = (await import("path")).join(
  process.cwd(),
  "data/tg/database.json",
);
const coinDb = TelegramDatabase(dbFile);
let ownerState = {};

async function checkJoin(bot, coinbotConfig, userId) {
  try {
    const chats = [...coinbotConfig.channels, coinbotConfig.group].filter(
      Boolean,
    );
    if (chats.length === 0) return true;
    for (let chat of chats) {
      const member = await bot.telegram.getChatMember(chat, userId);
      if (["left", "kicked", "restricted"].includes(member.status))
        return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

const mainMenu = (coinbotConfig, userId) => {
  if (!coinDb.hasUser(userId)) {
    coinDb.updateUser(userId, {
      coin: 0,
      joined: false,
      refCount: 0,
      lastClaim: 0,
      isBanned: false,
      claimedMissions: {},
    });
    coinDb.writeToFile();
  }

  const user = coinDb.getUser(userId);
  const saldo = (user.coin || 0).toLocaleString();

  const caption =
    `<b>─〔 🤖 BOT COIN SCRIPT 〕─</b>\n\n` +
    `👋 Selamat Datang, <b>${userId}</b>!\n` +
    `┣ 💰 <b>Saldo :</b> ${saldo} Coins\n` +
    `┣ 👥 <b>Referral :</b> ${user.refCount || 0} Orang\n` +
    `┗ 🆔 <b>Status :</b> ${userId === coinbotConfig.ownerId ? "Owner" : "Member"}\n\n` +
    `<blockquote>Kumpulkan koin dengan mengajak teman bergabung dan tukarkan dengan script premium!</blockquote>\n` +
    `<b>──────────────────────</b>`;

  let buttons = [
    [
      { text: "🛒 Tukar Coin", callback_data: "tukar_coin" },
      { text: "📜 List Script", callback_data: "list_script" },
    ],
    [
      { text: "🎁 Klaim Harian", callback_data: "daily_claim" },
      { text: "🎰 Lucky Spin", callback_data: "lucky_spin" },
    ],
    [
      { text: "📦 Mystery Box", callback_data: "gacha_script" },
      { text: "🎮 Tebak Angka", callback_data: "tebak_angka" },
    ],
    [
      { text: "📝 Misi Coin", callback_data: "list_misi" },
      { text: "💰 Beli Coin", callback_data: "beli_coin" },
    ],
    [
      { text: "💳 Ambil Coin", callback_data: "referral" },
      { text: "🏆 Top Sultan", callback_data: "leaderboard" },
    ],
    [
      { text: "📊 Statistik", callback_data: "bot_stats" },
      { text: "💸 Transfer Coin", callback_data: "transfer_coin" },
    ],
    [{ text: "🆓 Coin Gratis", callback_data: "coin_gratis" }],
    [{ text: "💬 Code Redeem", url: "https://t.me/bot_coin_info" }],
  ];

  if (userId === coinbotConfig.ownerId) {
    buttons.push([{ text: "⚙️ OWNER DASHBOARD", callback_data: "owner_menu" }]);
  }

  return {
    caption: caption,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons },
  };
};

const startTelegramBot = async (config) => {
  if (
    !config.tgbot ||
    !config.tgbot.botfatherToken ||
    config.tgbot.botfatherToken === "BOTFATHER_TOKEN"
  ) {
    (global.consolefy?.log || console.log)(
      "Telegram bot token not provided, skipping Telegram bot initialization.",
    );
    return null;
  }

  const bot = new Telegraf(config.tgbot.botfatherToken);

  // Setup Coinbot Logic Context
  const coinbotConfig = {
    channels: config.tgbot?.channels || [],
    group: config.tgbot?.group || "",
    notifChannel: config.tgbot?.notifChannel || "",
    startImage:
      config.tgbot?.startImage || "https://files.catbox.moe/w6izfk.jpg",
    ownerId: config.tgbot?.ownerId ? Number(config.tgbot.ownerId) : null,
  };

  await coinDb.readFromFile();
  bot.context.coinbot = {
    db: coinDb,
    saveDB: () => coinDb.writeToFile(),
    ownerState,
    config: coinbotConfig,
    checkJoin: (userId) => checkJoin(bot, coinbotConfig, userId),
    mainMenu: (userId) => mainMenu(coinbotConfig, userId),
  };

  // Error handling setup
  bot.catch((err, ctx) => {
    (global.consolefy?.error || console.error)(
      `Ooops, encountered an error for ${ctx.updateType}`,
      err,
    );
  });

  bot.use(async (ctx, next) => {
    // Maintenance Mode Check
    const coinbotConfig = ctx.coinbot?.config;
    const db = ctx.coinbot?.db;
    const userId = ctx.from?.id;

    if (db?.getSetting()?.maintenance && userId !== coinbotConfig?.ownerId) {
      if (ctx.callbackQuery) {
        await ctx
          .answerCbQuery(
            "🚧 Bot sedang Maintenance!\nSemua fitur dimatikan sementara.",
            { show_alert: true },
          )
          .catch(() => {});
        return;
      } else {
        await ctx
          .reply("🚧 <b>BOT SEDANG MAINTENANCE</b>", { parse_mode: "HTML" })
          .catch(() => {});
        return;
      }
    }

    if (ctx.callbackQuery) {
      // Suppress default loading state for buttons
      ctx.answerCbQuery().catch((e) => {
        (global.consolefy?.error || console.error)(
          "Error during answerCbQuery:",
          e,
        );
      });
    }

    await next();
  });

  // Command loading logic
  const pluginsPath = path.join(process.cwd(), "tg", "plugins");

  try {
    await fs.access(pluginsPath);
  } catch {
    await fs.mkdir(pluginsPath, { recursive: true });
  }

  const loadPlugins = async (dirPath) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await loadPlugins(fullPath);
        } else if (entry.name.endsWith(".js")) {
          try {
            const pluginUrl = new URL(`file://${fullPath}`);
            const plugin = await import(pluginUrl);
            if (plugin.default && typeof plugin.default === "function") {
              await plugin.default(bot);
            }
          } catch (e) {
            (global.consolefy?.error || console.error)(
              `Failed to load plugin ${entry.name}:`,
              e,
            );
          }
        }
      }
    } catch (e) {
      (global.consolefy?.error || console.error)(
        "Error reading tg plugins directory",
        e,
      );
    }
  };

  await loadPlugins(pluginsPath);

  bot
    .launch()
    .then(() => {
      (global.consolefy?.log || console.log)(
        "✅ Telegram bot started successfully.",
      );
      global.tgBot = bot;
    })
    .catch((err) => {
      (global.consolefy?.error || console.error)(
        "❌ Failed to start Telegram bot:",
        err,
      );
    });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));

  return bot;
};

export default startTelegramBot;
