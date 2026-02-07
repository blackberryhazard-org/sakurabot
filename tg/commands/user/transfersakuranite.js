const path = require('path');
const { Database } = require('simpl.db');

module.exports = {
    name: 'transfersakuranite',
    aliases: ['tf'],
    category: 'user',
    description: 'Transfer Sakuranite to your linked WhatsApp account.',
    code: async (ctx, { db, getSakuranite, updateSakuranite }) => {
        const userId = ctx.from.id;
        const waJid = db.get(`links.${userId}`);

        if (!waJid) {
            return ctx.reply('Akun Anda belum terhubung dengan WhatsApp. Silakan lakukan /link di bot WhatsApp.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        const amount = parseInt(args[0]);

        if (!amount || isNaN(amount) || amount <= 0) {
            return ctx.reply('Gunakan: /transfersakuranite {jumlah}');
        }

        const currentSakuranite = getSakuranite(userId);
        if (currentSakuranite < amount) {
            return ctx.reply('Sakuranite Anda tidak cukup!');
        }

        const fee = Math.floor(amount * 0.1);
        const received = amount - fee;

        // Deduct from TG
        updateSakuranite(userId, currentSakuranite - amount);

        // Add to WA
        try {
            const waDbPath = path.resolve(__dirname, '../../../database/wa/database.json');
            const waDb = new Database({ dataFile: waDbPath });
            const waSakuranite = waDb.get(`sakuranite.${waJid}`) || 0;
            waDb.set(`sakuranite.${waJid}`, waSakuranite + received);

            ctx.reply(`✅ <b>Transfer Berhasil!</b>\n\n➛ Jumlah: ${amount}\n➛ Biaya (10%): ${fee}\n➛ Diterima di WA: ${received}\n\nSakuranite Anda di TG sekarang: ${getSakuranite(userId)}`, { parse_mode: 'HTML' });

            if (global.waSock) {
                await global.waSock.sendMessage(waJid, { text: `🔔 *NOTIFIKASI TRANSFER*\n\nAnda menerima transfer Sakuranite dari Telegram!\n\n➛ Jumlah: *${received}*\n\nSilakan cek melalui /me` });
            }
        } catch (error) {
            console.error('Transfer failed:', error);
            // Rollback TG
            updateSakuranite(userId, getSakuranite(userId) + amount);
            ctx.reply('❌ Terjadi kesalahan saat memproses transfer. Saldo Anda telah dikembalikan.');
        }
    }
};
