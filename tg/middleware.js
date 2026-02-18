const { Consolefy } = require("consolefy");
const consolefy = new Consolefy({ tag: "TG-MIDDLEWARE" });

module.exports = (dependencies) => {
    const { db, config, helpers, bot, userCooldowns } = dependencies;
    const { userAccess, economy } = helpers;

    // Middleware to save user IDs
    const addUserMiddleware = (ctx, next) => {
        if (ctx.from && ctx.from.id) {
            const users = db.get("users") || [];
            if (!users.includes(ctx.from.id)) {
                users.push(ctx.from.id);
                db.set("users", users);
            }
        }
        return next();
    };

    // Middleware to check for banned users
    const banMiddleware = (ctx, next) => {
        if (!ctx.from) return next();

        const userId = ctx.from.id;
        let bans = db.get("bans") || [];
        const now = new Date();

        const activeBans = bans.filter(ban => new Date(ban.until) > now);
        if (activeBans.length < bans.length) db.set("bans", activeBans);

        if (activeBans.find(ban => ban.id === userId)) {
            return ctx.reply(config.msg.banned);
        }
        return next();
    };

    // Cooldown Middleware (Granular per command)
    const cooldownMiddleware = (ctx, next) => {
        if (!ctx.from) return next();

        const messageText = ctx.message && ctx.message.text ? ctx.message.text : "";
        const commandMatch = messageText.match(/^\/([a-zA-Z0-9_]+)/);
        if (!commandMatch) return next();

        const commandName = commandMatch[1];
        if (["start", "menu", "ping", "me"].includes(commandName)) return next();

        const userId = ctx.from.id;
        if (userAccess.isOwner(userId)) return next();

        const cooldownDuration = userAccess.isPremium(userId) ? 3000 : 10000;

        // Use CooldownService.check(userId, commandName, duration)
        const result = userCooldowns.check(userId, commandName, cooldownDuration);

        if (result.isLimited) {
            return ctx.reply(`${config.msg.cooldown} ${result.timeLeft.toFixed(1)}s`);
        }

        return next();
    };

    const channelSubMiddleware = async (ctx, next) => {
        if (!ctx.from || ctx.chat.type !== "private") return next();

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

                economy.addBalance(referrerId, 1000, "sakuranite");
                economy.addBalance(referrerId, 5, "gacha_tickets");

                try {
                    await bot.telegram.sendMessage(referrerId, `Congratulations! A user you referred (${ctx.from.first_name}) has successfully joined. You received 1000 Sakuranite and 5 gacha tickets.`);
                } catch (e) {
                    consolefy.error(`Failed to send referral notification to ${referrerId}:`, e);
                }
            }
        };

        if (!config.bot.tg_newsletterid || userAccess.isOwner(ctx.from.id)) {
            await processReferral();
            return next();
        }

        try {
            const chatMember = await ctx.telegram.getChatMember(config.bot.tg_newsletterid, ctx.from.id);
            if (["member", "administrator", "creator"].includes(chatMember.status)) {
                await processReferral();
                return next();
            } else {
                const chat = await ctx.telegram.getChat(config.bot.tg_newsletterid);
                const channelLink = chat.username ? `https://t.me/${chat.username}` : "Join via link provided by admin";
                return ctx.reply(`You must join our channel to use this bot. Please join here: ${channelLink}`);
            }
        } catch (error) {
            consolefy.error("Error in channelSubMiddleware:", error);
            return ctx.reply("Maaf, terjadi kesalahan saat memverifikasi status langganan channel Anda. Silakan coba lagi nanti atau hubungi owner.");
        }
    };

    return {
        addUserMiddleware,
        banMiddleware,
        cooldownMiddleware,
        channelSubMiddleware
    };
};
