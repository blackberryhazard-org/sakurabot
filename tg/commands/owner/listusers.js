const { Markup } = require("telegraf");

const USERS_PER_PAGE = 10;

const getStatus = (userId, isOwner, isPremium) => {
    if (isOwner(userId)) return "Owner";
    if (isPremium(userId)) return "Premium";
    return "User";
};

const formatUserList = async (ctx, userIds, page, helpers) => {
    const { isOwner, isPremium, escapeHTML } = helpers;
    const start = page * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;
    const currentUsers = userIds.slice(start, end);

    const userInfos = await Promise.all(currentUsers.map(async (userId) => {
        try {
            const chat = await ctx.telegram.getChat(userId);
            return {
                userId,
                username: chat.username ? `@${escapeHTML(chat.username)}` : escapeHTML(chat.first_name || "User")
            };
        } catch (_e) {
            return { userId, username: "N/A" };
        }
    }));

    let text = "";
    for (const info of userInfos) {
        const status = getStatus(info.userId, isOwner, isPremium);
        text += `${info.userId} (${info.username}) - ${status}\n`;
    }

    const totalEntries = userIds.length;
    const currentEntries = Math.min(end, totalEntries);
    text += `\n<i>Entri ${currentEntries} dari ${totalEntries}</i>`;

    return text;
};

const getPaginationButtons = (userIds, page) => {
    const buttons = [];
    const navRow = [];
    if (page > 0) {
        navRow.push(Markup.button.callback("◀️ Sebelumnya", `listusers_page:${page - 1}`));
    }
    if ((page + 1) * USERS_PER_PAGE < userIds.length) {
        navRow.push(Markup.button.callback("▶️ Selanjutnya", `listusers_page:${page + 1}`));
    }
    if (navRow.length > 0) buttons.push(navRow);

    buttons.push([
        Markup.button.callback("⚠️ Purge", "purge_users"),
        Markup.button.callback("📊 Analytics", "show_analytics")
    ]);
    return buttons;
};

const getAnalyticsData = (userIds, isOwner, isPremium) => {
    let owners = 0, premium = 0, regular = 0;
    for (const userId of userIds) {
        if (isOwner(userId)) owners++;
        else if (isPremium(userId)) premium++;
        else regular++;
    }
    return { regular, premium, owners, total: userIds.length };
};

const getAnalyticsChartUrl = (data) => {
    const chartConfig = {
        type: "pie",
        data: {
            labels: ["User", "Premium", "Owner"],
            datasets: [{
                data: [data.regular, data.premium, data.owners],
                backgroundColor: ["#36a2eb", "#ffce56", "#ff6384"]
            }]
        },
        options: {
            title: {
                display: true,
                text: "User Distribution"
            }
        }
    };
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
};

const getAnalyticsText = (data) => {
    return `📊 <b>User Analytics</b>\n\nTotal User: ${data.total}\n- User: ${data.regular}\n- Premium: ${data.premium}\n- Owner: ${data.owners}`;
};

module.exports = {
    name: "listusers",
    category: "owner",
    getAnalyticsData,
    getAnalyticsChartUrl,
    getAnalyticsText,
    code: async (ctx, helpers) => {
        const { isOwner, isPremium, db } = helpers;
        if (!isOwner(ctx.from.id)) return;

        let userIds = db.get("users") || [];
        if (!Array.isArray(userIds)) {
            userIds = Object.keys(userIds);
        }

        const text = await formatUserList(ctx, userIds, 0, helpers);
        const buttons = getPaginationButtons(userIds, 0);

        await ctx.reply(text, {
            parse_mode: "HTML",
            ...Markup.inlineKeyboard(buttons)
        });
    },
    callback: async (ctx, helpers) => {
        const { isOwner, isPremium, db } = helpers;
        if (!ctx.callbackQuery || !ctx.callbackQuery.data) return;
        const data = ctx.callbackQuery.data;

        if (data.startsWith("listusers_page:")) {
            if (!isOwner(ctx.from.id)) return ctx.answerCbQuery("Akses ditolak.");
            const page = parseInt(data.split(":")[1], 10);
            let userIds = db.get("users") || [];
            if (!Array.isArray(userIds)) {
                userIds = Object.keys(userIds);
            }

            const text = await formatUserList(ctx, userIds, page, helpers);
            const buttons = getPaginationButtons(userIds, page);

            try {
                await ctx.editMessageText(text, {
                    parse_mode: "HTML",
                    ...Markup.inlineKeyboard(buttons)
                });
            } catch (_e) {
                // Message might be the same or already edited
            }
            await ctx.answerCbQuery();
        } else if (data === "purge_users") {
            if (!isOwner(ctx.from.id)) return ctx.answerCbQuery("Akses ditolak.");

            let userIds = db.get("users") || [];
            if (!Array.isArray(userIds)) {
                userIds = Object.keys(userIds);
            }

            if (userIds.length > 500) {
                await ctx.answerCbQuery("Database is too large for bulk purge. Operation cancelled.", { show_alert: true });
                return;
            }

            await ctx.answerCbQuery("Purging users... Please wait.", { show_alert: true });

            const newUsers = [];
            let purgedCount = 0;

            for (const userId of userIds) {
                try {
                    await ctx.telegram.getChat(userId);
                    newUsers.push(userId);
                    // Sleep 100ms to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (_e) {
                    purgedCount++;
                }
            }

            db.set("users", newUsers);

            // Send notification to newsletter
            const config = helpers.config;
            if (config.bot.tg_newsletterid) {
                try {
                    await ctx.telegram.sendVideo(
                        config.bot.tg_newsletterid,
                        { url: "https://files.catbox.moe/51ib0k.mp4" },
                        {
                            caption: "⚠️ <b>User Purge Notification</b>\n\n" +
                                     `Owner <b>${ctx.from.first_name}</b> baru saja melakukan pembersihan database user.\n\n` +
                                     `- User dihapus: ${purgedCount}\n` +
                                     `- User tersisa: ${newUsers.length}`,
                            parse_mode: "HTML",
                            supports_streaming: true
                        }
                    );
                } catch (_e) {
                    console.error("Failed to send purge notification to newsletter:", _e);
                }
            }

            await ctx.reply(`Purge complete! Removed ${purgedCount} users with no accessible info (N/A).`);
        } else if (data === "show_analytics") {
            if (!isOwner(ctx.from.id)) return ctx.answerCbQuery("Akses ditolak.");
            await ctx.answerCbQuery("Generating analytics...");

            let userIds = db.get("users") || [];
            if (!Array.isArray(userIds)) {
                userIds = Object.keys(userIds);
            }

            const analyticsData = getAnalyticsData(userIds, isOwner, isPremium);
            const chartUrl = getAnalyticsChartUrl(analyticsData);
            const caption = getAnalyticsText(analyticsData);

            try {
                await ctx.replyWithPhoto(chartUrl, {
                    caption: caption,
                    parse_mode: "HTML"
                });
            } catch (_e) {
                await ctx.reply(`Gagal mengirim analytics: ${_e.message}`);
            }
        }
    }
};
