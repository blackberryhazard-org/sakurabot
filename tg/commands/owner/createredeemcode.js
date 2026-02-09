const crypto = require('crypto');

module.exports = {
    name: 'createredeemcode',
    category: 'owner',
    aliases: ['crc'],
    code: async (ctx, { isOwner, isLeader, db, config, bot }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }

        const args = ctx.message.text.split(' ').slice(1);
        const [type, amountStr, expiryHoursStr, quotaStr] = args;

        if (!type || !amountStr || !expiryHoursStr || !quotaStr) {
            return ctx.reply('Penggunaan: /createredeemcode {jenis} {jumlah} {kedaluwarsa_jam} {kuota}');
        }

        const normalizedType = type.toLowerCase();
        if (!['coins', 'gacha', 'sakuranite', 'mining'].includes(normalizedType)) {
            return ctx.reply('Jenis hadiah tidak valid. Gunakan "sakuranite", "coins", "gacha", atau "mining".');
        }

        if (normalizedType === 'coins' && !isLeader(ctx.from.id)) {
            return ctx.reply('Hanya leader yang dapat membuat kode redeem untuk koin.');
        }

        const amount = parseInt(amountStr, 10);
        const expiryHours = parseInt(expiryHoursStr, 10);
        const quota = parseInt(quotaStr, 10);

        if (isNaN(amount) || isNaN(expiryHours) || isNaN(quota) || amount <= 0) {
            return ctx.reply('Jumlah, kedaluwarsa, dan kuota harus berupa angka yang valid, dan jumlah harus lebih besar dari 0.');
        }

        const code = `SAKURA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const createdAt = Date.now();
        const expiresAt = expiryHours > 0 ? createdAt + (expiryHours * 60 * 60 * 1000) : null;

        const newCode = {
            code,
            type: normalizedType,
            amount,
            expiresAt,
            quota,
            claimedBy: [],
            createdAt
        };

        db.set(`redeem_codes.${code}`, newCode);

        await ctx.reply(`Kode redeem berhasil dibuat:\n<code>${code}</code>`, { parse_mode: 'HTML' });

        if (config.bot.tg_newsletterid) {
            let rewardText = '';
            if (normalizedType === 'sakuranite') {
                rewardText = `${amount} Sakuranite`;
            } else if (normalizedType === 'coins') {
                rewardText = `${amount} Koin`;
            } else if (normalizedType === 'gacha') {
                rewardText = `${amount} Tiket Gacha`;
            } else if (normalizedType === 'mining') {
                rewardText = `${amount} Tiket Mining`;
            }

            const broadcastMessage = `
<b>🎁 KODE REDEEM BARU</b>
Kode: <code>${code}</code>
Hadiah: <i>${rewardText}</i>
Kedaluwarsa: <i>${expiryHours > 0 ? `${expiryHours} Jam` : 'Tidak ada'}</i>
Kuota: <i>${quota > 0 ? `${quota} Pengguna` : 'Tidak terbatas'}</i>

Segera redeem dengan <code>/redeem ${code}</code> sebelum kehabisan!
            `;
            try {
                await bot.telegram.sendMessage(config.bot.tg_newsletterid, broadcastMessage, { parse_mode: 'HTML' });
            } catch (e) {
                console.error(`Gagal broadcast kode redeem: ${e.message}`);
                await ctx.reply('Gagal mengirim siaran ke channel buletin.');
            }
        }
    }
};
