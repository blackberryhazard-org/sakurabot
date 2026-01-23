const { Telegraf } = require('telegraf');
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
if (!db.has('redeem_codes')) db.set('redeem_codes', {});


// Middleware to save user IDs
const addUserMiddleware = (ctx, next) => {
    if (ctx.from && ctx.from.id) {
        const users = db.get('users');
        if (!users.includes(ctx.from.id)) {
            db.push('users', ctx.from.id);
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
// -------------------------

// Helper function to escape markdown characters for safe inclusion in messages
const escapeMarkdown = (text) => {
    if (typeof text !== 'string') {
        return text;
    }
    // Escapes *, _, `, and [
    return text.replace(/([_*`\[])/g, '\\$1');
};


const userCooldowns = new Map();
const activeTopups = new Map();

const launchTelegramBot = () => {
  const token = config.bot.botfather_token;
  const bot = new Telegraf(token);
  const pakasir = new Pakasir({
    slug: config.bot.pakasir_slug,
    key: config.bot.pakasir_apikey
  });

  global.botStartTime = Date.now(); // Store start time for uptime calculation

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
      escapeMarkdown,
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

            updateCoins(referrerId, getCoins(referrerId) + 10);
            updateGachaTickets(referrerId, getGachaTickets(referrerId) + 5);

            try {
                await bot.telegram.sendMessage(referrerId, `Congratulations! A user you referred (${ctx.from.first_name}) has successfully joined. You received 10 coins and 5 gacha tickets.`);
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

      const startTime = Date.now();
      const sentMessage = await ctx.reply('Pinging...');
      const endTime = Date.now();
      await ctx.telegram.editMessageText(
          ctx.chat.id,
          sentMessage.message_id,
          null,
          `Hello, ${ctx.from.first_name}!\nMy latency is ${endTime - startTime}ms.\n\nType /menu to see the list of available commands.`
      );
  });

  // --- Generic Callback Query Handler ---
  bot.on('callback_query', (ctx) => {
    // Iterate over all commands and let them decide if they can handle the callback
    for (const command of bot.cmd.values()) {
        if (typeof command.callback === 'function') {
            try {
                command.callback(ctx, helpers);
            } catch (e) {
                console.error(`Error in callback for command ${command.name}:`, e);
            }
        }
    }
  });

  bot.launch();

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
