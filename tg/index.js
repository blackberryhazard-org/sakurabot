const { Telegraf, Markup } = require("telegraf");
const config = require("../config.json");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

const { Database } = require("simpl.db");
const cron = require("node-cron");
const archiver = require("archiver");
const { Pakasir } = require("pakasir-sdk");
const { items_serpulo: items } = require("../tools/items");

// Import Services
const UserAccessService = require("../src/services/user-access.service");
const EconomyService = require("../src/services/economy.service");
const InventoryService = require("../src/services/inventory.service");

const dbPath = path.resolve(__dirname, "../database/tg");
fs.mkdirSync(dbPath, { recursive: true });

const db = new Database({
    dataFile: path.join(dbPath, "database.json"),
    autoSave: true,
    tabSize: 2
});

// Initialize database if keys don't exist
const keys = ["users", "bans", "premium", "groups", "channels", "coins", "managers", "gacha_tickets", "last_daily", "referred_by", "referrals", "pending_referrals", "sakuranite", "inventory", "links", "mining_tickets", "mining_rate"];
keys.forEach(key => {
    if (!db.has(key)) db.set(key, key === "coins" || key === "gacha_tickets" || key === "last_daily" || key === "referred_by" || key === "referrals" || key === "pending_referrals" || key === "sakuranite" || key === "inventory" || key === "links" || key === "mining_tickets" || key === "mining_rate" ? {} : []);
});

// Initialize Services
const userAccess = new UserAccessService(db, config);
const economy = new EconomyService(db, global.auditLog);
const inventoryService = new InventoryService(db);

const userCooldowns = new Map();
const activeTopups = new Map();

const launchTelegramBot = () => {
    const { escapeHTML, formatUptime } = global;
    const token = config.bot.botfather_token;
    const bot = new Telegraf(token);
    bot.games = new Map();
    const pakasir = new Pakasir({
        slug: config.pakasir.slug,
        apikey: config.pakasir.apikey
    });

    const helpers = {
        // Services
        userAccess,
        economy,
        inventory: inventoryService,

        // Legacy/Compatibility Helpers (Mapped to Services)
        getMiningTickets: (id) => economy.getBalance(id, "mining_tickets"),
        updateMiningTickets: (id, val) => economy.updateBalance(id, val, "mining_tickets"),
        getMiningRate: (id) => economy.getBalance(id, "mining_rate") || 0.10,
        updateMiningRate: (id, val) => economy.updateBalance(id, val, "mining_rate"),
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
        config
    };

    // Import and use middlewares
    const createMiddlewares = require("./middleware");
    const middlewares = createMiddlewares({ db, config, helpers, bot, userCooldowns });

    // Use middlewares
    bot.use(middlewares.banMiddleware);
    bot.use(middlewares.addUserMiddleware);
    bot.use(middlewares.channelSubMiddleware);
    bot.use(middlewares.cooldownMiddleware);

    bot.on("text", async (ctx, next) => {
        if (!ctx.message || !ctx.message.text || ctx.message.text.startsWith("/")) return next();

        const chatId = ctx.chat.id;
        const activeGame = bot.games.get(chatId);

        if (activeGame) {
            const result = tools.game.handleAnswer(
                activeGame,
                ctx.message.text,
                ctx.from.id,
                ctx.from.first_name,
                helpers.updateSakuranite,
                helpers.getSakuranite
            );

            if (result) {
                if (result.status === "game_over" || result.status === "surrender") {
                    if (activeGame.timeoutRef) clearTimeout(activeGame.timeoutRef);
                    bot.games.delete(chatId);
                }

                return await ctx.reply(result.message, {
                    parse_mode: "Markdown",
                    reply_to_message_id: ctx.message.message_id
                });
            }
        }
        return next();
    });

    bot.cmd = new Map();

    const loadCommands = (dir) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                loadCommands(fullPath);
            } else if (file.name.endsWith(".js")) {
                try {
                    const command = require(fullPath);
                    if (command.name) {
                        const category = path.basename(dir);
                        command.category = category;
                        bot.cmd.set(command.name, command);
                        if (command.aliases && Array.isArray(command.aliases)) {
                            command.aliases.forEach(alias => bot.cmd.set(alias, command));
                        }
                        bot.command(command.name, (ctx) => command.code(ctx, helpers));
                    }
                } catch (e) {
                    console.error(`Error loading command from ${fullPath}:`, e);
                }
            }
        }
    };
    loadCommands(path.resolve(__dirname, "commands"));

    helpers.bot = bot;

    bot.action(/^show_cat:(.+)$/, async (ctx) => {
        const categoryName = ctx.match[1];
        const commands = Array.from(bot.cmd.values())
            .filter((cmd, index, self) =>
                cmd.category === categoryName &&
                cmd.name !== undefined &&
                self.findIndex(c => c.name === cmd.name) === index
            )
            .map(cmd => `➡️ \`/${cmd.name}\``)
            .join("\n");

        const text = `*Kategori: ${categoryName.toUpperCase()}*\n\n${commands || "Tidak ada perintah."}`;

        try {
            await ctx.editMessageCaption(text, {
                parse_mode: "Markdown",
                ...Markup.inlineKeyboard([
                    [Markup.button.callback("⬅️ Kembali", "back_to_help")]
                ])
            });
        } catch (e) {
            await ctx.editMessageText(text, {
                parse_mode: "Markdown",
                ...Markup.inlineKeyboard([
                    [Markup.button.callback("⬅️ Kembali", "back_to_help")]
                ])
            });
        }
    });

    bot.action("back_to_help", async (ctx) => {
        try {
            await ctx.deleteMessage();
        } catch (e) {}
        const helpCmd = bot.cmd.get("help");
        if (helpCmd) {
            return helpCmd.code(ctx, helpers);
        }
    });

    bot.command("start", async (ctx) => {
        const args = ctx.message.text.split(" ");
        if (args.length > 1 && args[1].startsWith("ref_")) {
            const referrerId = args[1].split("_")[1];
            if (referrerId && /^\d+$/.test(referrerId) && parseInt(referrerId) !== ctx.from.id) {
                const users = db.get("users") || [];
                if (!users.includes(ctx.from.id)) {
                    db.set(`pending_referrals.${ctx.from.id}`, parseInt(referrerId));
                }
            }
        }

        const userName = ctx.from.first_name;
        const date = moment().tz("Asia/Jakarta").format("dddd, DD MMMM YYYY");
        const time = moment().tz("Asia/Jakarta").format("HH:mm:ss");
        const uptime = formatUptime(global.botStartTime);

        let dbSize = 0;
        try {
            const dbFilePath = path.resolve(__dirname, "../database/tg/database.json");
            const stats = fs.statSync(dbFilePath);
            dbSize = stats.size;
        } catch (e) {}
        const dbSizeFormatted = (dbSize / 1024).toFixed(2) + " KB";

        const welcomeText = `— Halo, *${userName}*! 👋\n\n` +
            `➛ *Tanggal*: ${date}\n` +
            `➛ *Waktu*: ${time}\n` +
            `➛ *Uptime*: ${uptime}\n` +
            `➛ *Database*: ${dbSizeFormatted}\n` +
            "➛ *Library*: Telegraf\n\n" +
            "Type /help to see the list of available commands.";

        const randomImageUrl = `https://picsum.photos/500/300?random=${Date.now()}`;

        try {
            await ctx.replyWithPhoto(randomImageUrl, {
                caption: welcomeText,
                parse_mode: "Markdown"
            });
        } catch (error) {
            await ctx.reply(welcomeText, { parse_mode: "Markdown" });
        }
    });

    bot.on("callback_query", (ctx) => {
        const seenCallbacks = new Set();
        for (const command of bot.cmd.values()) {
            if (typeof command.callback === "function" && !seenCallbacks.has(command.callback)) {
                seenCallbacks.add(command.callback);
                try {
                    command.callback(ctx, helpers);
                } catch (e) {
                    console.error(`Error in callback for command ${command.name}:`, e);
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

                await ctx.reply(
                    "✅ *PAYMENT CONFIRMED (Stars)*\n\n" +
                    `${coinAmount} coins have been added to your balance.`,
                    { parse_mode: "Markdown" }
                );

                const broadcastMessage = `
✅ TRANSAKSI BERHASIL (STARS)!

Item: ${coinAmount} Koin SakuraBot
Harga: ${ctx.message.successful_payment.total_amount} ⭐️
Waktu: ${moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")}
Buyer: ${ctx.from.first_name} (\`${userId}\`)

Ketentuan:
- Item yang sudah dibeli/dibayar tidak dapat dikembalikan
        `;

                if (config.bot.tg_newsletterid) {
                    try {
                        await bot.telegram.sendMessage(
                            config.bot.tg_newsletterid,
                            broadcastMessage,
                            { parse_mode: "Markdown" }
                        );
                    } catch (e) {
                        console.error("Broadcast error:", e);
                    }
                }
            }
        } catch (e) {
            console.error("Error handling successful payment:", e);
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

                    const coinReward = 5;
                    const sakuraniteReward = 1000;

                    helpers.addBalance(user.id, coinReward, "coins");
                    helpers.addBalance(user.id, sakuraniteReward, "sakuranite");

                    const rewardMsg = `🎉 Terima kasih telah menambahkan SakuraBot sebagai admin di <b>${chat.title || "grup/channel"}</b>!\n\n` +
                        "Kamu mendapatkan hadiah:\n" +
                        `💰 <b>${coinReward} Coins</b>\n` +
                        `🌸 <b>${sakuraniteReward} Sakuranite</b>\n\n` +
                        "Grup/Channel ini telah otomatis ditambahkan ke daftar broadcast.";

                    try {
                        await ctx.telegram.sendMessage(chat.id, `✅ SakuraBot telah ditambahkan ke daftar broadcast.\nTerima kasih kepada <a href="tg://user?id=${user.id}">${user.first_name}</a> atas hadiahnya!`, { parse_mode: "HTML" });
                    } catch (e) {}

                    try {
                        await ctx.telegram.sendMessage(user.id, rewardMsg, { parse_mode: "HTML" });
                    } catch (e) {}
                }
            }
        }
    });

    bot.launch();
    global.tgBot = bot;

    cron.schedule("0 0 */7 * *", async () => {
        if (!config.bot.tg_newsletterid) return;
        try {
            const listusers = require("./commands/owner/listusers");
            let userIds = db.get("users") || [];
            if (!Array.isArray(userIds)) userIds = Object.keys(userIds);

            const analyticsData = listusers.getAnalyticsData(userIds, helpers.isOwner, helpers.isPremium);
            const chartUrl = listusers.getAnalyticsChartUrl(analyticsData);
            const caption = listusers.getAnalyticsText(analyticsData);

            await bot.telegram.sendPhoto(config.bot.tg_newsletterid, chartUrl, {
                caption: `📅 <b>Weekly User Statistics Report</b>\n\n${caption}`,
                parse_mode: "HTML"
            });
        } catch (error) {
            console.error("Failed to send weekly user statistics:", error);
        }
    });

    if (config.system.autoBackup) {
        cron.schedule("0 0 */7 * *", () => {
            const backupPath = path.resolve(__dirname, "../database");
            const outputPath = path.resolve(__dirname, `../backup-${Date.now()}.zip`);
            const output = fs.createWriteStream(outputPath);
            const archive = archiver("zip", { zlib: { level: 9 } });

            output.on("close", async () => {
                try {
                    await bot.telegram.sendDocument(config.owner.id_tele, {
                        source: outputPath,
                        filename: path.basename(outputPath)
                    });
                    fs.unlinkSync(outputPath);
                    const configPath = path.resolve(__dirname, "../config.json");
                    await bot.telegram.sendDocument(config.owner.id_tele, {
                        source: configPath,
                        filename: "config.json"
                    });
                } catch (error) {
                    console.error("Failed to send scheduled backup:", error);
                }
            });
            archive.pipe(output);
            archive.directory(backupPath, false);
            archive.finalize();
        });
    }

    console.log("Telegram bot is running...");
};

module.exports = { launchTelegramBot };
