module.exports = {
    name: "transfersakuranite",
    aliases: ["tf"],
    category: "user",
    description: "Transfer Sakuranite to your linked Telegram account.",
    code: async (sock, m, { sender, from, args, linking, getSakuranite }) => {
        const amount = parseInt(args[0]);
        if (!amount || isNaN(amount) || amount <= 0) {
            return await sock.sendMessage(from, { text: "Gunakan: /transfersakuranite {jumlah}" }, { quoted: m });
        }

        try {
            const result = linking.transferSakuranite(sender, "wa", amount);

            await sock.sendMessage(from, { text: `✅ Transfer Berhasil!\n\n➛ Jumlah: ${result.amount}\n➛ Biaya (10%): ${result.fee}\n➛ Diterima di TG: ${result.received}\n\nSakuranite Anda di WA sekarang: ${getSakuranite(sender)}` }, { quoted: m });

            if (global.tgBot) {
                await global.tgBot.telegram.sendMessage(result.toId, `🔔 <b>NOTIFIKASI TRANSFER</b>\n\nAnda menerima transfer Sakuranite dari WhatsApp!\n\n➛ Jumlah: <b>${result.received}</b>\n\nSilakan cek melalui /me`, { parse_mode: "HTML" });
            }
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Gagal: ${error.message}` }, { quoted: m });
        }
    }
};
