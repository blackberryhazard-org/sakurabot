const { Telegraf } = require('telegraf');
const config = require('../config.json');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { Database } = require('simpl.db');
const cron = require('node-cron');
const archiver = require('archiver');

const db = new Database({
    dataFile: path.resolve(__dirname, '../database/tg/database.json'),
    autoSave: true,
    tabSize: 2
});

// Initialize database if keys don't exist
if (!db.has('users')) db.set('users', []);
if (!db.has('bans')) db.set('bans', []);
if (!db.has('premium')) db.set('premium', []);
if (!db.has('groups')) db.set('groups', []);
if (!db.has('coins')) db.set('coins', {});

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
        const until = new Date(userBan.until);
        return ctx.reply(`You are banned from using this bot. Your ban will be lifted on ${until.toUTCString()}.`);
    }

    return next();
};

// Helper function to check for owner
const isOwner = (userId) => {
    return config.bot.tg_owner.includes(userId);
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
// -------------------------

// Helper function to escape markdown characters for safe inclusion in messages
const escapeMarkdown = (text) => {
    if (typeof text !== 'string') {
        return text;
    }
    // Escapes *, _, `, and [
    return text.replace(/([_*`\[])/g, '\\$1');
};


const launchTelegramBot = () => {
  const token = config.bot.botfather_token;
  const bot = new Telegraf(token);

  global.botStartTime = Date.now(); // Store start time for uptime calculation

  const helpers = {
      isOwner,
      isPremium,
      getCoins,
      updateCoins,
      escapeMarkdown,
      db // Pass the db instance
  };

  // Use middlewares
  bot.use(banMiddleware);
  bot.use(addUserMiddleware);

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


  bot.launch();

  // Schedule a backup to run every 7 days
  cron.schedule('0 0 */7 * *', () => {
    const backupPath = path.resolve(__dirname, '../database');
    const outputPath = path.resolve(__dirname, `../backup-${Date.now()}.zip`);
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    output.on('close', async () => {
        try {
            for (const ownerId of config.bot.tg_owner) {
                await bot.telegram.sendDocument(ownerId, {
                    source: outputPath,
                    filename: path.basename(outputPath)
                });
            }
            fs.unlinkSync(outputPath);
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

  console.log('Telegram bot is running...');
};

module.exports = { launchTelegramBot };
