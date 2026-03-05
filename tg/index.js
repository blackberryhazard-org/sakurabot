const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const cron = require("node-cron");
const archiver = require("archiver");
const didyoumean = require("didyoumean");
const Pakasir = require("pakasir-sdk");

// Import Services & Shared DB
const { getDb } = require("../src/shared/database");
const UserAccessService = require("../src/services/user-access.service");
const EconomyService = require("../src/services/economy.service");
const InventoryService = require("../src/services/inventory.service");
const LinkingService = require("../src/services/linking.service");
const GameService = require("../src/services/game.service");
const MiningService = require("../src/services/mining.service");
const CooldownService = require("../src/services/cooldown.service");
const levelling = require("../src/services/levelling");
const items = InventoryService.items_serpulo;

const db = getDb("tg");
const waDb = getDb("wa");

const userCooldowns = new CooldownService();

const launchTelegramBot = async (config, consolefy, tools) => {
    const appConfig = config || global.config;
    const appConsolefy = consolefy || global.consolefy;
    const { formatUptime } = tools.utils;

    // Initialize database keys
    const keys = ["users", "premium", "managers", "sakuranite", "inventory", "last_daily", "links", "mining_tickets", "mining_rate"];
    keys.forEach(key => {
        if (!db.has(key)) db.set(key, (key === "sakuranite" || key === "inventory" || key === "last_daily" || key === "links" || key === "mining_tickets" || key === "mining_rate") ? {} : []);
    });

    // Initialize Services
    const userAccess = new UserAccessService(db, appConfig);
    const economy = new EconomyService(db, global.auditLog);
    const waEconomy = new EconomyService(waDb, global.auditLog);
    const inventoryService = new InventoryService(db);
    const linking = new LinkingService(db, waDb, economy, waEconomy);
    const gameService = new GameService(economy);
    const miningService = new MiningService(economy, inventoryService);

    const token = appConfig.tgbot.botfatherToken;
    const bot = new Telegraf(token);
    bot.games = new Map();

    const pakasirConfig = appConfig.services?.pakasir;
    const pakasir = pakasirConfig ? new Pakasir({
        slug: pakasirConfig.slug,
        apikey: pakasirConfig.apiKey
    }) : null;

    const helpers = {
        userAccess,
        economy,
        inventory: inventoryService,
        linking,
        game: gameService,
        mining: miningService,
        auditLog: global.auditLog,
        getMiningTickets: (id) => miningService.getTickets(id),
        updateMiningTickets: (id, val) => miningService.updateTickets(id, val),
        getMiningRate: (id) => miningService.getRate(id),
        updateMiningRate: (id, val) => miningService.updateRate(id, val),
        isLeader: (id) => userAccess.isLeader(id),
        isOwner: (id) => userAccess.isOwner(id),
        isPremium: (id) => userAccess.isPremium(id),
        getSakuranite: (id) => economy.getBalance(id, "sakuranite"),
        updateSakuranite: (id, amount) => economy.updateBalance(id, amount, "sakuranite"),
        getCoins: (id) => economy.getBalance(id, "coins"),
        updateCoins: (id, amount) => economy.updateBalance(id, amount, "coins"),
        getInventory: (id) => inventoryService.getInventory(id),
        updateInventory: (id, item, amount) => inventoryService.addItem(id, item, amount),
        pakasir,
        db,
        items,
        levelling
    };

    const dependencies = {
        db,
        config: appConfig,
        helpers,
        bot,
        userCooldowns
    };

    const middleware = require("./middleware")(dependencies);
    bot.use(middleware.addUserMiddleware);
    bot.use(middleware.banMiddleware);
    bot.use(middleware.channelSubMiddleware);
    bot.use(middleware.cooldownMiddleware);

    bot.on("text", async (ctx, next) => {
        const chatId = ctx.chat.id.toString();
        const activeGame = bot.games.get(chatId);
        if (activeGame) {
            const body = ctx.message.text;
            const result = gameService.handleAnswer(activeGame, body, ctx.from.id.toString(), ctx.from.first_name);
            if (result) {
                if (result.status === "game_over" || result.status === "surrender") {
                    if (activeGame.timeoutRef) clearTimeout(activeGame.timeoutRef);
                    bot.games.delete(chatId);
                }
                return await ctx.reply(result.message, { parse_mode: "Markdown", reply_to_message_id: ctx.message.message_id });
            }
        }
        return next();
    });

    bot.cmd = new Map();
    const loadCommands = (dir) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) loadCommands(fullPath);
            else if (file.name.endsWith(".js")) {
                try {
                    const command = require(fullPath);
                    if (command.name) {
                        command.category = path.basename(dir);
                        bot.cmd.set(command.name, command);
                        if (command.aliases) {
                            command.aliases.forEach(alias => {
                                bot.cmd.set(alias, command);
                                bot.command(alias, (ctx) => command.code(ctx, helpers));
                            });
                        }
                        bot.command(command.name, (ctx) => command.code(ctx, helpers));
                    }
                } catch (e) {
                    if (appConsolefy && appConsolefy.error) appConsolefy.error(`Error loading command from ${fullPath}:`, e);
                    else console.error(`Error loading command from ${fullPath}:`, e);
                }
            }
        }
    };
    loadCommands(path.resolve(__dirname, "commands"));
    helpers.bot = bot;

    bot.on("text", async (ctx, next) => {
        if (!ctx.message || !ctx.message.text || !ctx.message.text.startsWith("/")) return next();
        const commandMatch = ctx.message.text.split(/\s+/)[0].slice(1).split("@")[0];
        if (commandMatch === "start") return next();
        if (!bot.cmd.has(commandMatch)) {
            const allCommands = Array.from(bot.cmd.keys());
            const suggestion = didyoumean(commandMatch, allCommands);
            if (suggestion) {
                return ctx.reply(`Command */${commandMatch}* tidak ditemukan. Mungkin maksud Anda */${suggestion}*?`, { parse_mode: "Markdown" });
            }
        }
        return next();
    });

    bot.action(/^show_cat:(.+)$/, async (ctx) => {
        const categoryName = ctx.match[1];
        const commands = Array.from(bot.cmd.values())
            .filter((cmd, index, self) => cmd.category === categoryName && cmd.name !== undefined && self.findIndex(c => c.name === cmd.name) === index)
            .map(cmd => `➡️ \`/${cmd.name}\``)
            .join("\n");
        const text = `*Kategori: ${categoryName.toUpperCase()}*\n\n${commands || "Tidak ada perintah."}`;
        try { await ctx.editMessageCaption(text, { parse_mode: "Markdown", ...Markup.inlineKeyboard([[Markup.button.callback("⬅️ Kembali", "back_to_help")]]) }); }
        catch (e) {
            const errText = "Failed to edit message caption";
            if (appConsolefy && appConsolefy.error) appConsolefy.error(errText, e);
            try { await ctx.editMessageText(text, { parse_mode: "Markdown", ...Markup.inlineKeyboard([[Markup.button.callback("⬅️ Kembali", "back_to_help")]]) }); } catch (_err) { /* ignore */ }
        }
    });

    bot.action("back_to_help", async (ctx) => {
        try { await ctx.deleteMessage(); } catch (_e) { /* ignore */ }
        const helpCmd = bot.cmd.get("help");
        if (helpCmd) return helpCmd.code(ctx, helpers);
    });

    bot.command("start", async (ctx) => {
        const args = ctx.message.text.split(" ");
        if (args.length > 1 && args[1].startsWith("ref_")) {
            const referrerId = args[1].split("_")[1];
            if (referrerId && /^\d+$/.test(referrerId) && parseInt(referrerId) !== ctx.from.id) {
                const users = db.get("users") || [];
                if (!users.includes(ctx.from.id)) {
                    const pendingRefs = db.get("pending_referrals") || {};
                    pendingRefs[ctx.from.id] = parseInt(referrerId);
                    db.set("pending_referrals", pendingRefs);
                }
            }
        }
        const date = moment().tz("Asia/Jakarta").format("dddd, DD MMMM YYYY");
        const time = moment().tz("Asia/Jakarta").format("HH:mm:ss");
        const uptime = formatUptime(global.botStartTime);
        let dbSize = 0;
        try { dbSize = fs.statSync(path.resolve(__dirname, "../database/tg/database.json")).size; } catch (_e) { /* ignore */ }
        const welcomeText = `— Halo, *${ctx.from.first_name}*! 👋\n\n➛ *Tanggal*: ${date}\n➛ *Waktu*: ${time}\n➛ *Uptime*: ${uptime}\n➛ *Database*: ${(dbSize / 1024).toFixed(2)} KB\n➛ *Library*: Telegraf\n\nType /help to see the list of available commands.`;
        try { await ctx.replyWithPhoto(`https://picsum.photos/500/300?random=${Date.now()}`, { caption: welcomeText, parse_mode: "Markdown" }); }
        catch (_error) { await ctx.reply(welcomeText, { parse_mode: "Markdown" }); }
    });

    bot.on("callback_query", (ctx) => {
        const seenCallbacks = new Set();
        for (const command of bot.cmd.values()) {
            if (typeof command.callback === "function" && !seenCallbacks.has(command.callback)) {
                seenCallbacks.add(command.callback);
                try { command.callback(ctx, helpers); } catch (e) {
                    if (appConsolefy && appConsolefy.error) appConsolefy.error(`Error in callback for command ${command.name}:`, e);
                    else console.error(`Error in callback for command ${command.name}:`, e);
                }
            }
        }
    });

    bot.on("pre_checkout_query", (ctx) => ctx.answerPreCheckoutQuery(true));
    bot.on("successful_payment", async (ctx) => {
        try {
            const payload = JSON.parse(ctx.message.successful_payment.invoice_payload);
            const { userId, coinAmount, method } = payload;
            if (method === "stars") {
                helpers.updateCoins(userId, helpers.getCoins(userId) + coinAmount);
                await ctx.reply(`✅ *PAYMENT CONFIRMED (Stars)*\n\n${coinAmount} coins have been added to your balance.`, { parse_mode: "Markdown" });
                const broadcastMessage = `✅ TRANSAKSI BERHASIL (STARS)!\n\nItem: ${coinAmount} Koin SakuraBot\nHarga: ${ctx.message.successful_payment.total_amount} ⭐️\nWaktu: ${moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")}\nBuyer: ${ctx.from.first_name} (\`${userId}\`)\n\nKetentuan:\n- Item yang sudah dibeli/dibayar tidak dapat dikembalikan`;
                if (appConfig.tgbot.newsletterId) {
                    try { await bot.telegram.sendMessage(appConfig.tgbot.newsletterId, broadcastMessage, { parse_mode: "Markdown" }); } catch (e) {
                        if (appConsolefy && appConsolefy.error) appConsolefy.error("Broadcast error:", e);
                        else console.error("Broadcast error:", e);
                    }
                }
            }
        } catch (e) {
            if (appConsolefy && appConsolefy.error) appConsolefy.error("Error handling successful payment:", e);
            else console.error("Error handling successful payment:", e);
        }
    });


    try {
        await bot.launch();
        global.botStatus.tg = true;
        global.tgBot = bot;
    } catch (e) {
        if (appConsolefy && appConsolefy.error) appConsolefy.error("Failed to launch Telegram bot:", e);
        global.botStatus.tg = false;
        global.tgBot = null;
    }

    cron.schedule("0 0 */7 * *", async () => {
        if (!appConfig.tgbot.newsletterId) return;
        try {
            const listusers = require("./commands/owner/listusers");
            let userIds = db.get("users") || [];
            if (!Array.isArray(userIds)) userIds = Object.keys(userIds);
            const analyticsData = listusers.getAnalyticsData(userIds, helpers.isOwner, helpers.isPremium);
            const chartUrl = listusers.getAnalyticsChartUrl(analyticsData);
            const caption = listusers.getAnalyticsText(analyticsData);
            await bot.telegram.sendPhoto(appConfig.tgbot.newsletterId, chartUrl, { caption: `📅 <b>Weekly User Statistics Report</b>\n\n${caption}`, parse_mode: "HTML" });
        } catch (error) {
            if (appConsolefy && appConsolefy.error) appConsolefy.error("Failed to send weekly user statistics:", error);
            else console.error("Failed to send weekly user statistics:", error);
        }
    });
    if (appConfig.system.autoBackup) {
        cron.schedule("0 0 */7 * *", () => {
            const outputPath = path.resolve(__dirname, `../backup-${Date.now()}.zip`);
            const output = fs.createWriteStream(outputPath);
            const archive = archiver("zip", { zlib: { level: 9 } });
            output.on("close", async () => {
                try {
                    await bot.telegram.sendDocument(appConfig.owner.telegramId, { source: outputPath, filename: path.basename(outputPath) });
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    await bot.telegram.sendDocument(appConfig.owner.telegramId, { source: path.resolve(__dirname, "../config.json"), filename: "config.json" });
                } catch (error) {
                    if (appConsolefy && appConsolefy.error) appConsolefy.error("Failed to send scheduled backup:", error);
                    else console.error("Failed to send scheduled backup:", error);
                }
            });
            archive.pipe(output); archive.directory(path.resolve(__dirname, "../database"), false); archive.finalize();
        });
    }
    if (appConsolefy && appConsolefy.info) appConsolefy.info("Telegram bot is running...");
    else console.log("Telegram bot is running...");
};
module.exports = { launchTelegramBot };
