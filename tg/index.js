const { Telegraf, Markup } = require('telegraf');
const config = require('../config.json');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const { Database } = require('simpl.db');
const cron = require('node-cron');
const archiver = require('archiver');
const { Pakasir } = require('pakasir-sdk');

const dbPath = path.resolve(__dirname, '../database/tg');
fs.mkdirSync(dbPath, { recursive: true });

const db = new Database({
    dataFile: path.join(dbPath, 'database.json'),
    autoSave: true,
    tabSize: 2
});

// Initialize database if keys don't exist
if (!db.has('users')) db.set('users', []);
if (!db.has('bans')) db.set('bans', []);
if (!db.has('premium')) db.set('premium', []);
if (!db.has('groups')) db.set('groups', []);
if (!db.has('coins')) db.set('coins', {});
if (!db.has('managers')) db.set('managers', []);
if (!db.has('gacha_tickets')) db.set('gacha_tickets', {});
if (!db.has('last_daily')) db.set('last_daily', {});
if (!db.has('referred_by')) db.set('referred_by', {});
if (!db.has('referrals')) db.set('referrals', {});
if (!db.has('pending_referrals')) db.set('pending_referrals', {});
if (!db.has('sakuranite')) db.set('sakuranite', {});
if (!db.has('inventory')) db.set('inventory', {});
if (!db.has('links')) db.set('links', {});


// Middleware to save user IDs
const addUserMiddleware = (ctx, next) => {
    if (ctx.from && ctx.from.id) {
        const users = db.get('users') || [];
        if (!users.includes(ctx.from.id)) {
            users.push(ctx.from.id);
            db.set('users', users);
        }
    }
    return next();
};

// Middleware to check for banned users
const banMiddleware = (ctx, next) => {
    if (!ctx.from) {
        return next();
    }

    const userId = ctx.from.id;
    let bans = db.get('bans');
    const now = new Date();

    // Filter out expired bans
    const activeBans = bans.filter(ban => {
        const until = new Date(ban.until);
        return until > now;
    });

    // If the list of bans changed, write it back
    if (activeBans.length < bans.length) {
        db.set('bans', activeBans);
    }

    const userBan = activeBans.find(ban => ban.id === userId);

    if (userBan) {
        return ctx.reply(config.msg.banned);
    }

    return next();
};

// Helper function to check for leader
const isLeader = (userId) => {
    return config.owner.id_tele === userId.toString();
};

// Helper function to check for owner (leader or manager)
const isOwner = (userId) => {
    const managers = db.get('managers') || [];
    return isLeader(userId) || managers.includes(userId);
};

// Helper function to check for premium
const isPremium = (userId) => {
    const premiumUsers = db.get('premium');
    return premiumUsers.includes(userId);
};

// --- Coin System Helpers ---
const getCoins = (userId) => {
    return db.get(`coins.${userId}`) || 0;
};

const updateCoins = (userId, amount) => {
    db.set(`coins.${userId}`, amount);
};

const getGachaTickets = (userId) => {
    return db.get(`gacha_tickets.${userId}`) || 0;
};

const updateGachaTickets = (userId, amount) => {
    db.set(`gacha_tickets.${userId}`, amount);
};

const getSakuranite = (userId) => {
    return db.get(`sakuranite.${userId}`) || 0;
};

const updateSakuranite = (userId, amount) => {
    db.set(`sakuranite.${userId}`, amount);
};

const userCooldowns = new Map();
const activeTopups = new Map();

const launchTelegramBot = () => {
  const { escapeHTML, formatUptime } = global;
  const token = config.bot.botfather_token;
  const bot = new Telegraf(token);
  const pakasir = new Pakasir({
    slug: config.pakasir.slug,
    apikey: config.pakasir.apikey
  });

  const helpers = {
      pakasir,
      activeTopups,
      isLeader,
      isOwner,
      isPremium,
      getCoins,
      updateCoins,
      getGachaTickets,
      updateGachaTickets,
      getSakuranite,
      updateSakuranite,
      escapeHTML,
      db, // Pass the db instance
      config // Pass the full config
  };

  // Cooldown Middleware
  const cooldownMiddleware = (ctx, next) => {
    if (!ctx.from) {
        return next();
    }

    // Extract command name from the message text
    const messageText = ctx.message && ctx.message.text ? ctx.message.text : '';
    const commandMatch = messageText.match(/^\/([a-zA-Z0-9_]+)/);
    if (!commandMatch) {
        return next();
    }
    const commandName = commandMatch[1];


    const excludedCommands = ['start', 'menu', 'ping', 'me'];
    if (excludedCommands.includes(commandName)) {
        return next();
    }

    const userId = ctx.from.id;
    if (isOwner(userId)) {
        return next();
    }

    const now = Date.now();
    const lastCommandTime = userCooldowns.get(userId) || 0;

    const cooldownDuration = isPremium(userId) ? 3000 : 10000; // 3 seconds for premium, 10 for normal

    if (now - lastCommandTime < cooldownDuration) {
        const timeLeft = (cooldownDuration - (now - lastCommandTime)) / 1000;
        return ctx.reply(`${config.msg.cooldown} ${timeLeft.toFixed(1)}s`);
    }

    userCooldowns.set(userId, now);
    return next();
  };

  const channelSubMiddleware = async (ctx, next) => {
    if (!ctx.from || ctx.chat.type !== 'private') {
        return next();
    }

    // Function to process a successful referral
    const processReferral = async () => {
        const pendingReferral = db.get(`pending_referrals.${ctx.from.id}`);
        if (pendingReferral) {
            const referrerId = pendingReferral;
            db.set(`referred_by.${ctx.from.id}`, referrerId);

            let referrerReferrals = db.get(`referrals.${referrerId}`) || [];
            if (!Array.isArray(referrerReferrals)) referrerReferrals = [];
            referrerReferrals.push(ctx.from.id);
            db.set(`referrals.${referrerId}`, referrerReferrals);

            db.delete(`pending_referrals.${ctx.from.id}`);

            updateSakuranite(referrerId, getSakuranite(referrerId) + 1000);
            updateGachaTickets(referrerId, getGachaTickets(referrerId) + 5);

            try {
                await bot.telegram.sendMessage(referrerId, `Congratulations! A user you referred (${ctx.from.first_name}) has successfully joined. You received 1000 Sakuranite and 5 gacha tickets.`);
            } catch (e) {
                console.error(`Failed to send referral notification to ${referrerId}:`, e);
            }
        }
    };

    if (!config.bot.tg_newsletterid || isOwner(ctx.from.id)) {
        await processReferral();
        return next();
    }

    try {
        const chatMember = await ctx.telegram.getChatMember(config.bot.tg_newsletterid, ctx.from.id);
        if (['member', 'administrator', 'creator'].includes(chatMember.status)) {
            await processReferral();
            return next();
        } else {
            const channelLink = `https://t.me/${(await ctx.telegram.getChat(config.bot.tg_newsletterid)).username}`;
            return ctx.reply(`You must join our channel to use this bot. Please join here: ${channelLink}`);
        }
    } catch (error) {
        console.error("Error in channel subscription middleware:", error);
        return ctx.reply("Sorry, I couldn't verify your channel membership. Please try again later.");
    }
  };

  // Use middlewares
  bot.use(banMiddleware);
  bot.use(addUserMiddleware);
  bot.use(channelSubMiddleware);
  bot.use(cooldownMiddleware);

  // Store commands in a map
  bot.cmd = new Map();

  // Dynamically load commands from subdirectories
  const loadCommands = (dir) => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
              loadCommands(fullPath);
          } else if (file.name.endsWith('.js')) {
              try {
                const command = require(fullPath);
                if (command.name) {
                    // Add category to the command object
                    const category = path.basename(dir);
                    command.category = category;
                    bot.cmd.set(command.name, command);
                    // Also register aliases
                    if (command.aliases && Array.isArray(command.aliases)) {
                        command.aliases.forEach(alias => bot.cmd.set(alias, command));
                    }
                    // Register the command with Telegraf, passing helpers
                    bot.command(command.name, (ctx) => command.code(ctx, helpers));
                }
              } catch (e) {
                console.error(`Error loading command from ${fullPath}:`, e);
              }
          }
      }
  };
  loadCommands(path.resolve(__dirname, 'commands'));

  // Attach bot.cmd to helpers so menu can access it
  helpers.bot = bot;

  // Handler untuk klik kategori menu
  bot.action(/^show_cat:(.+)$/, async (ctx) => {
      const categoryName = ctx.match[1];

      // Ambil daftar command berdasarkan kategori dari bot.cmd
      const commands = Array.from(bot.cmd.values())
          .filter((cmd, index, self) =>
              cmd.category === categoryName &&
              cmd.name !== undefined &&
              self.findIndex(c => c.name === cmd.name) === index
          )
          .map(cmd => `➡️ \`/${cmd.name}\``)
          .join('\n');

      const text = `*Kategori: ${categoryName.toUpperCase()}*\n\n${commands || 'Tidak ada perintah.'}`;

      try {
          await ctx.editMessageCaption(text, {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                  [Markup.button.callback('⬅️ Kembali', 'back_to_help')]
              ])
          });
      } catch (e) {
          await ctx.editMessageText(text, {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                  [Markup.button.callback('⬅️ Kembali', 'back_to_help')]
              ])
          });
      }
  });

  // Handler tombol kembali
  bot.action('back_to_help', async (ctx) => {
      try {
          await ctx.deleteMessage();
      } catch (e) {
          // Ignore if message already deleted
      }
      const helpCmd = bot.cmd.get('help');
      if (helpCmd) {
          return helpCmd.code(ctx, helpers);
      }
  });

  // --- /start command ---
  bot.command('start', async (ctx) => {
      const args = ctx.message.text.split(' ');
      if (args.length > 1 && args[1].startsWith('ref_')) {
          const referrerId = args[1].split('_')[1];
          if (referrerId && /^\d+$/.test(referrerId) && parseInt(referrerId) !== ctx.from.id) {
              const users = db.get('users') || [];
              if (!users.includes(ctx.from.id)) {
                db.set(`pending_referrals.${ctx.from.id}`, parseInt(referrerId));
              }
          }
      }

      const userName = ctx.from.first_name;
      const date = moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY');
      const time = moment().tz('Asia/Jakarta').format('HH:mm:ss');
      const uptime = formatUptime(global.botStartTime);

      let dbSize = 0;
      try {
          const dbFilePath = path.resolve(__dirname, '../database/tg/database.json');
          const stats = fs.statSync(dbFilePath);
          dbSize = stats.size;
      } catch (e) {}
      const dbSizeFormatted = (dbSize / 1024).toFixed(2) + ' KB';

      const welcomeText = `— Halo, *${userName}*! 👋\n\n` +
          `➛ *Tanggal*: ${date}\n` +
          `➛ *Waktu*: ${time}\n` +
          `➛ *Uptime*: ${uptime}\n` +
          `➛ *Database*: ${dbSizeFormatted}\n` +
          `➛ *Library*: Telegraf\n\n` +
          `Type /help to see the list of available commands.`;

      const randomImageUrl = `https://picsum.photos/500/300?random=${Date.now()}`;

      try {
          await ctx.replyWithPhoto(randomImageUrl, {
              caption: welcomeText,
              parse_mode: 'Markdown'
          });
      } catch (error) {
          await ctx.reply(welcomeText, { parse_mode: 'Markdown' });
      }
  });

  // --- Generic Callback Query Handler ---
  bot.on('callback_query', (ctx) => {
    // Iterate over all unique commands and let them decide if they can handle the callback
    const seenCallbacks = new Set();
    for (const command of bot.cmd.values()) {
        if (typeof command.callback === 'function' && !seenCallbacks.has(command.callback)) {
            seenCallbacks.add(command.callback);
            try {
                command.callback(ctx, helpers);
            } catch (e) {
                console.error(`Error in callback for command ${command.name}:`, e);
            }
        }
    }
  });

  // --- Payment Handlers (Telegram Stars) ---
  bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));

  bot.on('successful_payment', async (ctx) => {
    try {
      const payload = JSON.parse(ctx.message.successful_payment.invoice_payload);
      const { userId, coinAmount, method } = payload;

      if (method === 'stars') {
        updateCoins(userId, getCoins(userId) + coinAmount);

        await ctx.reply(
          `✅ *PAYMENT CONFIRMED (Stars)*

` +
          `${coinAmount} coins have been added to your balance.`,
          { parse_mode: 'Markdown' }
        );

        const broadcastMessage = `
✅ TRANSAKSI BERHASIL (STARS)!

Item: ${coinAmount} Koin SakuraBot
Harga: ${ctx.message.successful_payment.total_amount} ⭐️
Waktu: ${moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')}
Buyer: ${ctx.from.first_name} (\`${userId}\`)

Ketentuan:
- Item yang sudah dibeli/dibayar tidak dapat dikembalikan
        `;

        if (config.bot.tg_newsletterid) {
          try {
            await bot.telegram.sendMessage(
              config.bot.tg_newsletterid,
              broadcastMessage,
              { parse_mode: 'Markdown' }
            );
          } catch (e) {
            console.error('Broadcast error:', e);
          }
        }
      }
    } catch (e) {
      console.error('Error handling successful payment:', e);
    }
  });

  bot.launch();
  global.tgBot = bot;

  // Schedule user statistics every 7 days
  cron.schedule('0 0 */7 * *', async () => {
    if (!config.bot.tg_newsletterid) return;

    try {
        const listusers = require('./commands/owner/listusers');
        let userIds = db.get('users') || [];
        if (!Array.isArray(userIds)) {
            userIds = Object.keys(userIds);
        }

        const analyticsData = listusers.getAnalyticsData(userIds, isOwner, isPremium);
        const chartUrl = listusers.getAnalyticsChartUrl(analyticsData);
        const caption = listusers.getAnalyticsText(analyticsData);

        await bot.telegram.sendPhoto(config.bot.tg_newsletterid, chartUrl, {
            caption: `📅 <b>Weekly User Statistics Report</b>\n\n${caption}`,
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('Failed to send weekly user statistics:', error);
    }
  });

  // Schedule a backup to run every 7 days if enabled
  if (config.system.autoBackup) {
    cron.schedule('0 0 */7 * *', () => {
        const backupPath = path.resolve(__dirname, '../database');
        const outputPath = path.resolve(__dirname, `../backup-${Date.now()}.zip`);
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', async () => {
            try {
                await bot.telegram.sendDocument(config.owner.id_tele, {
                    source: outputPath,
                    filename: path.basename(outputPath)
                });
                fs.unlinkSync(outputPath);

                // Send config.json
                const configPath = path.resolve(__dirname, '../config.json');
                await bot.telegram.sendDocument(config.owner.id_tele, {
                    source: configPath,
                    filename: 'config.json'
                });
            } catch (error) {
                console.error('Failed to send scheduled backup:', error);
            }
        });
        archive.on('error', (err) => {
            console.error('Error during scheduled backup archiving:', err);
        });
        archive.pipe(output);
        archive.directory(backupPath, false);
        archive.finalize();
    });
  }

  console.log('Telegram bot is running...');
};

module.exports = { launchTelegramBot };
