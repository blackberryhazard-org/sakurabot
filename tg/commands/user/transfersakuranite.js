module.exports = {
    name: "transfersakuranite",
    aliases: ["tf"],
    category: "user",
    description: "Transfer Sakuranite to your linked WhatsApp account.",
    code: async (ctx, { linking, getSakuranite }) => {
        const userId = ctx.from.id;
        const args = ctx.message.text.split(" ").slice(1);
        const amount = parseInt(args[0]);

        if (!amount || isNaN(amount) || amount <= 0) {
            return ctx.reply("Gunakan: /transfersakuranite {jumlah}");
        }

        try {
            const result = linking.transferSakuranite(userId, "tg", amount);

            ctx.reply(`✅ <b>Transfer Berhasil!</b>\n\n➛ Jumlah: ${result.amount}\n➛ Biaya (10%): ${result.fee}\n➛ Diterima di WA: ${result.received}\n\nSakuranite Anda di TG sekarang: ${getSakuranite(userId)}`, { parse_mode: "HTML" });

            if (global.waSock) {
                await global.waSock.sendMessage(result.toId, { text: `🔔 *NOTIFIKASI TRANSFER*\n\nAnda menerima transfer Sakuranite dari Telegram!\n\n➛ Jumlah: *${result.received}*\n\nSilakan cek melalui /me` });
            }
        } catch (error) {
            ctx.reply(`❌ Gagal: ${error.message}`);
        }
    }
};
