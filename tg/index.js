const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const cron = require("node-cron");
const archiver = require("archiver");
const { Pakasir } = require("pakasir-sdk");

// Import Services & Shared DB
const { getDb } = require("../src/database");
const UserAccessService = require("../src/services/user-access.service");
const EconomyService = require("../src/services/economy.service");
const InventoryService = require("../src/services/inventory.service");
const items = InventoryService.items_serpulo;
const LinkingService = require("../src/services/linking.service");
const GameService = require("../src/services/game.service");
const MiningService = require("../src/services/mining.service");
const CooldownService = require("../src/services/cooldown.service");

const db = getDb("tg");
const waDb = getDb("wa");

// Initialize database if keys don't exist
const keys = ["users", "bans", "premium", "groups", "channels", "coins", "managers", "gacha_tickets", "last_daily", "referred_by", "referrals", "pending_referrals", "sakuranite", "inventory", "links", "mining_tickets", "mining_rate"];
keys.forEach(key => {
    if (!db.has(key)) db.set(key, key === "coins" || key === "gacha_tickets" || key === "last_daily" || key === "referred_by" || key === "referrals" || key === "pending_referrals" || key === "sakuranite" || key === "inventory" || key === "links" || key === "mining_tickets" || key === "mining_rate" ? {} : []);
});

const userCooldowns = new CooldownService();
const activeTopups = new Map();

const launchTelegramBot = (config, consolefy, tools) => {
    const appConfig = config || global.config;
    const appConsolefy = consolefy || global.consolefy;
    const appTools = tools || global.tools;
    const { escapeHTML, formatUptime } = appTools.utils;

    // Initialize Services
    const userAccess = new UserAccessService(db, appConfig);
    const economy = new EconomyService(db, global.auditLog);
    const waEconomy = new EconomyService(waDb, global.auditLog);
    const inventoryService = new InventoryService(db);
    const linking = new LinkingService(db, waDb, economy, waEconomy);
    const gameService = new GameService(economy);
    const miningService = new MiningService(economy, inventoryService);

    const token = appConfig.bot.botfather_token;
    const bot = new Telegraf(token);
    bot.games = new Map();
    const pakasir = new Pakasir({
        slug: appConfig.pakasir.slug,
        apikey: appConfig.pakasir.apikey
    });

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
        getCoins: (id) => economy.getBalance(id, "coins"),
        updateCoins: (id, val) => economy.updateBalance(id, val, "coins"),
        getGachaTickets: (id) => economy.getBalance(id, "gacha_tickets"),
        updateGachaTickets: (id, val) => economy.updateBalance(id, val, "gacha_tickets"),
        getSakuranite: (id) => economy.getBalance(id, "sakuranite"),
        updateSakuranite: (id, val) => economy.updateBalance(id, val, "sakuranite"),
        getInventory: (id) => inventoryService.getInventory(id),
        updateInventory: (id, item, amount) => inventoryService.addItem(id, item, amount),
        items,
        pakasir,
        activeTopups,
        escapeHTML,
        db,
        config: appConfig
    };

    const createMiddlewares = require("./middleware");
    const middlewares = createMiddlewares({ db, config: appConfig, helpers, bot, userCooldowns });

    bot.use(middlewares.banMiddleware);
    bot.use(middlewares.addUserMiddleware);
    bot.use(middlewares.channelSubMiddleware);
    bot.use(middlewares.cooldownMiddleware);

    bot.on("text", async (ctx, next) => {
        if (!ctx.message || !ctx.message.text || ctx.message.text.startsWith("/")) return next();
        const chatId = ctx.chat.id;
        const activeGame = bot.games.get(chatId);
        if (activeGame) {
            const result = gameService.handleAnswer(
                activeGame,
                ctx.message.text,
                ctx.from.id,
                ctx.from.first_name
            );
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
                        if (command.aliases) command.aliases.forEach(alias => bot.cmd.set(alias, command));
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
                if (!users.includes(ctx.from.id)) db.set(`pending_referrals.${ctx.from.id}`, parseInt(referrerId));
            }
        }
        const userName = ctx.from.first_name;
        const date = moment().tz("Asia/Jakarta").format("dddd, DD MMMM YYYY");
        const time = moment().tz("Asia/Jakarta").format("HH:mm:ss");
        const uptime = formatUptime(global.botStartTime);
        let dbSize = 0;
        try { dbSize = fs.statSync(path.resolve(__dirname, "../database/tg/database.json")).size; } catch (_e) { /* ignore */ }
        const welcomeText = `— Halo, *${userName}*! 👋\n\n➛ *Tanggal*: ${date}\n➛ *Waktu*: ${time}\n➛ *Uptime*: ${uptime}\n➛ *Database*: ${(dbSize / 1024).toFixed(2)} KB\n➛ *Library*: Telegraf\n\nType /help to see the list of available commands.`;
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
                if (appConfig.bot.tg_newsletterid) {
                    try { await bot.telegram.sendMessage(appConfig.bot.tg_newsletterid, broadcastMessage, { parse_mode: "Markdown" }); } catch (e) {
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

    bot.on("my_chat_member", async (ctx) => {
        const { old_chat_member, new_chat_member, chat } = ctx.myChatMember;
        const user = ctx.myChatMember.from;
        if (new_chat_member.status === "administrator" && old_chat_member.status !== "administrator") {
            const isChannel = chat.type === "channel";
            const isGroup = chat.type === "group" || chat.type === "supergroup";
            if (isChannel || isGroup) {
                const key = isChannel ? "channels" : "groups";
                const list = db.get(key) || [];
                if (!list.includes(chat.id)) {
                    list.push(chat.id);
                    db.set(key, list);
                    helpers.economy.addBalance(user.id, 5, "coins");
                    helpers.economy.addBalance(user.id, 1000, "sakuranite");
                    const rewardMsg = `🎉 Terima kasih telah menambahkan SakuraBot sebagai admin di <b>${chat.title || "grup/channel"}</b>!\n\nKamu mendapatkan hadiah:\n💰 <b>5 Coins</b>\n🌸 <b>1000 Sakuranite</b>\n\nGrup/Channel ini telah otomatis ditambahkan ke daftar broadcast.`;
                    try { await ctx.telegram.sendMessage(chat.id, `✅ SakuraBot telah ditambahkan ke daftar broadcast.\nTerima kasih kepada <a href="tg://user?id=${user.id}">${user.first_name}</a> atas hadiahnya!`, { parse_mode: "HTML" }); } catch (_e) { /* ignore */ }
                    try { await ctx.telegram.sendMessage(user.id, rewardMsg, { parse_mode: "HTML" }); } catch (_e) { /* ignore */ }
                }
            }
        }
    });

    bot.launch();
    global.tgBot = bot;
    cron.schedule("0 0 */7 * *", async () => {
        if (!appConfig.bot.tg_newsletterid) return;
        try {
            const listusers = require("./commands/owner/listusers");
            let userIds = db.get("users") || [];
            if (!Array.isArray(userIds)) userIds = Object.keys(userIds);
            const analyticsData = listusers.getAnalyticsData(userIds, helpers.isOwner, helpers.isPremium);
            const chartUrl = listusers.getAnalyticsChartUrl(analyticsData);
            const caption = listusers.getAnalyticsText(analyticsData);
            await bot.telegram.sendPhoto(appConfig.bot.tg_newsletterid, chartUrl, { caption: `📅 <b>Weekly User Statistics Report</b>\n\n${caption}`, parse_mode: "HTML" });
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
                    await bot.telegram.sendDocument(appConfig.owner.id_tele, { source: outputPath, filename: path.basename(outputPath) });
                    fs.unlinkSync(outputPath);
                    await bot.telegram.sendDocument(appConfig.owner.id_tele, { source: path.resolve(__dirname, "../config.json"), filename: "config.json" });
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
