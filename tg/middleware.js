module.exports = (dependencies) => {
    const { db, config, helpers, bot, userCooldowns } = dependencies;
    const { isOwner, isPremium, updateSakuranite, getSakuranite, updateGachaTickets, getGachaTickets } = helpers;

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
                const chat = await ctx.telegram.getChat(config.bot.tg_newsletterid);
                const channelLink = chat.username ? `https://t.me/${chat.username}` : `Join via link provided by admin`;
                return ctx.reply(`You must join our channel to use this bot. Please join here: ${channelLink}`);
            }
        } catch (error) {
            console.error('Error in channelSubMiddleware:', error);
            return next();
        }
    };

    return {
        addUserMiddleware,
        banMiddleware,
        cooldownMiddleware,
        channelSubMiddleware
    };
};
