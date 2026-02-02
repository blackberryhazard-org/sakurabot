const { Markup } = require('telegraf');

const USERS_PER_PAGE = 10;

const getStatus = (userId, isOwner, isPremium) => {
    if (isOwner(userId)) return 'Owner';
    if (isPremium(userId)) return 'Premium';
    return 'User';
};

const formatUserList = async (ctx, userIds, page, helpers) => {
    const { isOwner, isPremium } = helpers;
    const start = page * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;
    const currentUsers = userIds.slice(start, end);

    const userInfos = await Promise.all(currentUsers.map(async (userId) => {
        try {
            const chat = await ctx.telegram.getChat(userId);
            return {
                userId,
                username: chat.username ? `@${chat.username}` : (chat.first_name || 'User')
            };
        } catch (e) {
            return { userId, username: 'N/A' };
        }
    }));

    let text = '';
    for (const info of userInfos) {
        const status = getStatus(info.userId, isOwner, isPremium);
        text += `${info.userId} (${info.username}) - ${status}\n`;
    }

    const totalEntries = userIds.length;
    const currentEntries = Math.min(end, totalEntries);
    text += `\n<i>Entri ${currentEntries} dari ${totalEntries}</i>`;

    return text;
};

module.exports = {
    name: 'listusers',
    category: 'owner',
    code: async (ctx, helpers) => {
        const { isOwner, db } = helpers;
        if (!isOwner(ctx.from.id)) return;

        let userIds = db.get('users') || [];
        if (!Array.isArray(userIds)) {
            userIds = Object.keys(userIds);
        }

        const text = await formatUserList(ctx, userIds, 0, helpers);

        const buttons = [];
        if (userIds.length > USERS_PER_PAGE) {
            buttons.push(Markup.button.callback('▶️ Selanjutnya', 'listusers_page:1'));
        }

        await ctx.reply(text, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([buttons])
        });
    },
    callback: async (ctx, helpers) => {
        const { isOwner, db } = helpers;
        if (!ctx.callbackQuery || !ctx.callbackQuery.data || !ctx.callbackQuery.data.startsWith('listusers_page:')) return;
        if (!isOwner(ctx.from.id)) return ctx.answerCbQuery('Akses ditolak.');

        const page = parseInt(ctx.callbackQuery.data.split(':')[1], 10);
        let userIds = db.get('users') || [];
        if (!Array.isArray(userIds)) {
            userIds = Object.keys(userIds);
        }

        const text = await formatUserList(ctx, userIds, page, helpers);

        const buttons = [];
        if (page > 0) {
            buttons.push(Markup.button.callback('◀️ Sebelumnya', `listusers_page:${page - 1}`));
        }
        if ((page + 1) * USERS_PER_PAGE < userIds.length) {
            buttons.push(Markup.button.callback('▶️ Selanjutnya', `listusers_page:${page + 1}`));
        }

        try {
            await ctx.editMessageText(text, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([buttons])
            });
        } catch (e) {
            // Message might be the same or already edited
        }
        await ctx.answerCbQuery();
    }
};
