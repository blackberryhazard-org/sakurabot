export default (bot) => {
    bot.action('coin_gratis', async (ctx) => {
        const { ownerState } = ctx.coinbot;
        const userId = ctx.from.id;

        const teksPromosi = `🚀 *MAU SCRIPT VIP GRATIS?*\n\nBuruan gabung ke bot ini, kumpulkan koinnya dan tukar dengan script favorit kamu!\n\n🔗 *Link Bot:* @Coin_Script_Bot\n🎁 *Bonus:* 5.000 Coin buat kamu yang share!`;
        const fotoPromosi = `https://files.catbox.moe/w6izfk.jpg`;

        await ctx.replyWithPhoto(fotoPromosi, {
            caption: `<b>💰 MISI SHARE & DAPAT KOIN</b>\n\nShare foto di atas dengan teks di bawah ini:\n\n<code>${teksPromosi}</code>\n\n<b>Setelah share, silakan screenshot dan kirim fotonya ke sini!</b>`,
            parse_mode: 'HTML'
        });

        ownerState[userId] = { step: 'waiting_bukti_share' };
        return ctx.reply("📸 <b>Silahkan kirim FOTO bukti screenshot kamu sekarang:</b>", { parse_mode: 'HTML' });
    });

    bot.action('create_misi_ads', async (ctx) => {
        const { ownerState, config: coinbotConfig } = ctx.coinbot;
        const userId = ctx.from.id;

        if (userId !== coinbotConfig.ownerId) return;

        ownerState[userId] = { step: 'create_misi_link' };
        return ctx.reply("🔗 <b>MASUKKAN LINK MISI</b>\n\nContoh: <code>https://t.me/NamaChannelKamu</code>", { parse_mode: 'HTML' });
    });

    bot.action('list_misi', async (ctx) => {
        const txtMisi = `<b>📝 MISI KOIN GRATIS</b>\n\nSelesaikan misi di bawah ini:\n...`;
        ctx.editMessageCaption(txtMisi, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📢 Join", url: "https://t.me/Rayernon" }],
                    [{ text: "✅ Ambil Hadiah", callback_data: "claim_misi" }],
                    [{ text: "⬅️ Kembali", callback_data: "back_home" }]
                ]
            }
        }).catch((e) => { (global.consolefy?.error || console.error)('Error execution:', e); });
    });

    bot.action('claim_misi', async (ctx) => {
        const { db, saveDB, checkJoin, mainMenu } = ctx.coinbot;
        const userId = ctx.from.id;

        const isJoined = await checkJoin(userId);
        if (isJoined) {
            if (db.users[userId].misiSelesai) return ctx.answerCbQuery("❌ Kamu sudah mengambil hadiah misi ini!", { show_alert: true });

            db.users[userId].coin += 5000;
            db.users[userId].misiSelesai = true;
            await saveDB();

            ctx.reply("<b>🎉 MISI SELESAI!</b>\n+5.000 koin.", { parse_mode: 'HTML' }).catch((e) => { (global.consolefy?.error || console.error)('Error execution:', e); });
            ctx.editMessageCaption(mainMenu(userId).caption, mainMenu(userId)).catch((e) => { (global.consolefy?.error || console.error)('Error execution:', e); });
        } else {
            ctx.answerCbQuery("❌ Kamu belum join semua channel!", { show_alert: true });
        }
    });

    bot.action(/^check_join\|(.+)\|(\d+)\|(.+)$/, async (ctx) => {
        const { db, saveDB } = ctx.coinbot;
        const userId = ctx.from.id;

        const channel = ctx.match[1];
        const rewardAmount = parseInt(ctx.match[2]);
        const misiId = ctx.match[3];

        if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) {
            return ctx.answerCbQuery("❌ Data misi tidak valid!", { show_alert: true });
        }

        if (!db.users[userId]) {
            db.users[userId] = { coin: 0, joined: false, refCount: 0, lastClaim: 0, isBanned: false, claimedMissions: {} };
        }
        if (!db.users[userId].claimedMissions) db.users[userId].claimedMissions = {};

        if (db.users[userId].claimedMissions[misiId]) {
            return ctx.answerCbQuery("❌ Kamu sudah mengklaim hadiah misi ini!", { show_alert: true });
        }

        try {
            const chatMember = await bot.telegram.getChatMember(`@${channel}`, userId);
            const status = chatMember.status;

            if (['member', 'administrator', 'creator'].includes(status)) {
                db.users[userId].coin = (db.users[userId].coin || 0) + rewardAmount;
                db.users[userId].claimedMissions[misiId] = true;
                await saveDB();

                await ctx.answerCbQuery(`🎉 Berhasil! +${rewardAmount} Koin masuk.`, { show_alert: true });
                return ctx.editMessageText(`✅ <b>MISI SELESAI</b>\n\nKamu sudah bergabung dan mendapatkan <b>${rewardAmount.toLocaleString()}</b> koin.`, { parse_mode: 'HTML' });
            } else {
                return ctx.answerCbQuery("❌ Kamu belum join!", { show_alert: true });
            }
        } catch (err) {
            return ctx.answerCbQuery("⚠️ Gagal cek status! Pastikan Bot sudah menjadi ADMIN.", { show_alert: true });
        }
    });
};
