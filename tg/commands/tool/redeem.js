module.exports = {
    name: 'redeem',
    category: 'tool',
    code: async (ctx, { db, isOwner, getCoins, updateCoins, getGachaTickets, updateGachaTickets, getSakuranite, updateSakuranite, config, bot }) => {
        const userId = ctx.from.id;
        const args = ctx.message.text.split(' ').slice(1);
        const code = args[0];

        if (!code) {
            return ctx.reply('Penggunaan: /redeem {kode}');
        }

        const redeemCode = db.get(`redeem_codes.${code}`);

        if (!redeemCode) {
            return ctx.reply('Kode redeem tidak valid atau sudah kedaluwarsa.');
        }

        if (redeemCode.expiresAt && Date.now() > redeemCode.expiresAt) {
            db.delete(`redeem_codes.${code}`);
            return ctx.reply('Kode redeem ini sudah kedaluwarsa.');
        }

        if (redeemCode.claimedBy.includes(userId)) {
            return ctx.reply('Anda sudah pernah menukarkan kode ini.');
        }

        if (redeemCode.quota > 0 && redeemCode.claimedBy.length >= redeemCode.quota) {
            return ctx.reply('Maaf, kuota untuk kode redeem ini sudah habis.');
        }

        let rewardMessage = '';
        if (redeemCode.type === 'coins') {
            const sakuraniteAmount = redeemCode.amount * 100;
            if (!isOwner(userId)) {
                updateSakuranite(userId, getSakuranite(userId) + sakuraniteAmount);
                rewardMessage = `${sakuraniteAmount} Sakuranite`;
            } else {
                rewardMessage = `${sakuraniteAmount} Sakuranite (Hanya untuk User)`;
            }
        } else if (redeemCode.type === 'sakuranite') {
            if (!isOwner(userId)) {
                updateSakuranite(userId, getSakuranite(userId) + redeemCode.amount);
                rewardMessage = `${redeemCode.amount} Sakuranite`;
            } else {
                rewardMessage = `${redeemCode.amount} Sakuranite (Hanya untuk User)`;
            }
        } else if (redeemCode.type === 'gacha') {
            updateGachaTickets(userId, getGachaTickets(userId) + redeemCode.amount);
            rewardMessage = `${redeemCode.amount} tiket gacha`;
        }

        redeemCode.claimedBy.push(userId);
        db.set(`redeem_codes.${code}`, redeemCode);

        await ctx.reply(`Selamat! Anda berhasil menukarkan kode dan mendapatkan ${rewardMessage}.`);

        if (config.bot.tg_newsletterid) {
            const notificationText = `<i>${ctx.from.first_name} baru saja menukarkan kode ${code} dan mendapatkan ${rewardMessage}!</i>`;
            try {
                const sentMessage = await bot.telegram.sendMessage(config.bot.tg_newsletterid, notificationText, { parse_mode: 'HTML' });
                setTimeout(() => {
                    bot.telegram.deleteMessage(config.bot.tg_newsletterid, sentMessage.message_id).catch(e => console.error(`Gagal menghapus pesan notifikasi redeem: ${e.message}`));
                }, 5000); // Hapus setelah 5 detik
            } catch (e) {
                console.error(`Gagal mengirim notifikasi redeem: ${e.message}`);
            }
        }
    }
};
