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

    // Cooldown Middleware (Granular per canonical command)
    const cooldownMiddleware = (ctx, next) => {
        if (!ctx.from) return next();

        const messageText = ctx.message && ctx.message.text ? ctx.message.text : "";
        const commandMatch = messageText.match(/^\/([a-zA-Z0-9_]+)/);
        if (!commandMatch) return next();

        const inputCommand = commandMatch[1];
        const cmd = bot.cmd.get(inputCommand);
        const canonicalName = cmd ? (cmd.name || inputCommand) : inputCommand;

        if (["start", "menu", "ping", "me"].includes(canonicalName)) return next();

        const userId = ctx.from.id;
        if (userAccess.isOwner(userId)) return next();

        const cooldownDuration = userAccess.isPremium(userId) ? 3000 : 10000;

        // Use CooldownService.check(userId, canonicalName, duration)
        const result = userCooldowns.check(userId, canonicalName, cooldownDuration);

        if (result.isLimited) {
            return ctx.reply(`${config.msg.cooldown} ${result.timeLeft.toFixed(1)}s`);
        }

        return next();
    };

    const channelSubMiddleware = async (ctx, next) => {
        if (!ctx.from || ctx.chat.type !== "private") return next();

        const processReferral = async () => {
            const pendingRefs = db.get("pending_referrals") || {};
            const pendingReferral = pendingRefs[ctx.from.id];
            if (pendingReferral) {
                const referrerId = pendingReferral;

                const referredBy = db.get("referred_by") || {};
                referredBy[ctx.from.id] = referrerId;
                db.set("referred_by", referredBy);

                const referrals = db.get("referrals") || {};
                let referrerReferrals = referrals[referrerId] || [];
                if (!Array.isArray(referrerReferrals)) referrerReferrals = [];
                referrerReferrals.push(ctx.from.id);
                referrals[referrerId] = referrerReferrals;
                db.set("referrals", referrals);

                delete pendingRefs[ctx.from.id];
                db.set("pending_referrals", pendingRefs);

                economy.updateBalance(referrerId, 1000, "sakuranite");
                economy.updateBalance(referrerId, 5, "gacha_tickets");

                try {
                    await bot.telegram.sendMessage(referrerId, `<b>Selamat!</b> Pengguna yang Anda rujuk (<b>${ctx.from.first_name}</b>) telah berhasil bergabung. Anda menerima 1000 Sakuranite dan 5 tiket gacha.`, { parse_mode: "HTML" });
                } catch (e) {
                    consolefy.error(`Failed to send referral notification to ${referrerId}:`, e);
                }
            }
        };

        const newsletterId = config.tgbot.newsletterId;
        const isNewsletterSet = newsletterId && !newsletterId.includes("NEWSLETTER_ID");

        if (!isNewsletterSet || userAccess.isOwner(ctx.from.id)) {
            await processReferral();
            return next();
        }

        try {
            const chatMember = await ctx.telegram.getChatMember(newsletterId, ctx.from.id);
            if (["member", "administrator", "creator"].includes(chatMember.status)) {
                await processReferral();
                return next();
            } else {
                const chat = await ctx.telegram.getChat(newsletterId);
                const channelLink = chat.username ? `https://t.me/${chat.username}` : "Join via link provided by admin";
                return ctx.reply(`Anda harus bergabung dengan channel kami untuk menggunakan bot ini. Silakan bergabung di sini: ${channelLink}`);
            }
        } catch (error) {
            // Check if it's a 400 error (user not found or bot not admin)
            if (error.response && error.response.error_code === 400) {
                if (error.description.includes("chat not found") || error.description.includes("admin")) {
                    consolefy.warn(`Newsletter verification error: ${error.description}. Please ensure the bot is an admin in the channel ${newsletterId}`);
                    // If bot is not admin or chat not found, we can't verify.
                    // To avoid locking out everyone due to misconfiguration, we'll allow access but log the error.
                    await processReferral();
                    return next();
                }
            }

            consolefy.error("Error in channelSubMiddleware:", error);
            // Default to fail-safe if it's a real membership issue
            if (error.description && error.description.includes("user not found")) {
                try {
                    const chat = await ctx.telegram.getChat(newsletterId);
                    const channelLink = chat.username ? `https://t.me/${chat.username}` : "Join via link provided by admin";
                    return ctx.reply(`Anda harus bergabung dengan channel kami untuk menggunakan bot ini. Silakan bergabung di sini: ${channelLink}`);
                } catch (e) {
                    // Ignore
                }
            }

            return ctx.reply("Maaf, terjadi kesalahan saat memverifikasi status langganan channel Anda. Silakan coba lagi nanti atau hubungi owner.");
        }
    };


    return {
        addUserMiddleware,
        banMiddleware,
        cooldownMiddleware,
        channelSubMiddleware,
    };
};
