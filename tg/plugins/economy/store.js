export default (bot) => {
    bot.action(['list_script', 'tukar_coin', /^page_(\d+)$/], async (ctx) => {
        const { db } = ctx.coinbot;
        if (db.scripts.length === 0) return ctx.answerCbQuery("Kosong!", { show_alert: true });

        const pageMatch = ctx.callbackQuery.data.match(/^page_(\d+)$/);
        const page = pageMatch ? parseInt(pageMatch[1]) : 0;
        const perPage = 5;
        const start = page * perPage;
        const end = start + perPage;
        const items = db.scripts.slice(start, end);

        let buttons = items.map((s, index) => [
            { text: `📂 ${s.name} [ ${s.price.toLocaleString()} ]`, callback_data: `buy_${start + index}` }
        ]);

        let navRow = [];
        navRow.push(page > 0 ? { text: "⬅️ Back", callback_data: `page_${page - 1}` } : { text: "⬛", callback_data: "none" });
        navRow.push({ text: "🏠 HOME", callback_data: "back_home" });
        navRow.push(end < db.scripts.length ? { text: "Next ➡️", callback_data: `page_${page + 1}` } : { text: "⬛", callback_data: "none" });
        buttons.push(navRow);

        ctx.editMessageCaption(`<b>📂 LIST SCRIPT (Hal: ${page + 1})</b>\nPilih script yang ingin ditukar:`, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons }
        }).catch((e) => { (global.consolefy?.error || console.error)('Error during execution:', e); });
    });

    bot.action(/^buy_(\d+)$/, async (ctx) => {
        const { db, saveDB, config: coinbotConfig } = ctx.coinbot;
        const userId = ctx.from.id;

        const index = parseInt(ctx.match[1]);
        if (!Number.isInteger(index) || index < 0 || index >= db.scripts.length) return ctx.answerCbQuery("❌ Script tidak ditemukan!", { show_alert: true });

        const script = db.scripts[index];
        if (db.users[userId].coin < script.price) return ctx.answerCbQuery("❌ Koin tidak cukup!", { show_alert: true });

        db.users[userId].coin -= script.price;
        await saveDB();

        await ctx.replyWithDocument(script.fileId, {
            caption: `<b>✅ PENUKARAN BERHASIL</b>\n\n┣ 📂 <b>Nama:</b> ${script.name}\n┗ 💸 <b>Harga:</b> ${script.price.toLocaleString()} Coins`,
            parse_mode: 'HTML'
        }).catch((e) => { (global.consolefy?.error || console.error)('Error during execution:', e); });

        if (coinbotConfig.notifChannel) {
            bot.telegram.sendMessage(coinbotConfig.notifChannel, `<b>🚀 LOG PENUKARAN</b>\n👤 User: <code>${userId}</code>\n📂 Script: ${script.name}`, { parse_mode: 'HTML' }).catch((e) => { (global.consolefy?.error || console.error)('Error during execution:', e); });
        }
        ctx.answerCbQuery("✅ Berhasil!", { show_alert: true });
    });
};
