module.exports = {
    name: 'removeredeemcode',
    category: 'owner',
    aliases: ['rrc'],
    code: async (ctx, { isOwner, db, config }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }

        const args = ctx.message.text.split(' ').slice(1);
        const code = args[0];

        if (!code) {
            return ctx.reply('Penggunaan: /removeredeemcode {kode}');
        }

        if (!db.has(`redeem_codes.${code}`)) {
            return ctx.reply('Kode redeem tidak ditemukan.');
        }

        db.delete(`redeem_codes.${code}`);

        return ctx.reply(`Kode redeem <code>${code}</code> telah berhasil dihapus.`, { parse_mode: 'HTML' });
    }
};
