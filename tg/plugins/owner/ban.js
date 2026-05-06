export default (bot) => {
    bot.hears(/^\/ban (.+)/, async (ctx) => {
        const { db, saveDB, config: coinbotConfig } = ctx.coinbot;
        if (ctx.from.id !== coinbotConfig.ownerId) return;
        const targetId = ctx.match[1].trim();
        if (!db.users[targetId]) return ctx.reply("❌ ID tidak ditemukan.");

        db.users[targetId].isBanned = true;
        await saveDB();
        ctx.reply(`✅ User <code>${targetId}</code> berhasil di-BANNED.`, { parse_mode: 'HTML' });
        bot.telegram.sendMessage(targetId, "🚫 <b>AKUN KAMU DI BANNED!</b>\nKamu tidak bisa lagi menggunakan layanan bot ini.", { parse_mode: 'HTML' }).catch((e) => { (global.consolefy?.error || console.error)('Error during execution:', e); });
    });

    bot.hears(/^\/unban (.+)/, async (ctx) => {
        const { db, saveDB, config: coinbotConfig } = ctx.coinbot;
        if (ctx.from.id !== coinbotConfig.ownerId) return;
        const targetId = ctx.match[1].trim();
        if (!db.users[targetId]) return ctx.reply("❌ ID tidak ditemukan.");

        db.users[targetId].isBanned = false;
        await saveDB();
        ctx.reply(`✅ User <code>${targetId}</code> telah di-UNBAN.`, { parse_mode: 'HTML' });
        bot.telegram.sendMessage(targetId, "✅ <b>AKUN KEMBALI AKTIF!</b>\nSekarang kamu bisa menggunakan bot lagi.", { parse_mode: 'HTML' }).catch((e) => { (global.consolefy?.error || console.error)('Error during execution:', e); });
    });
};
