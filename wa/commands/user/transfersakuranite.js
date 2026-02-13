const path = require("path");

module.exports = {
    name: "transfersakuranite",
    aliases: ["tf"],
    category: "user",
    description: "Transfer Sakuranite to your linked Telegram account.",
    code: async (sock, m, { sender, from, args, db, getSakuranite, updateSakuranite }) => {
        const tgId = db.get(`links.${sender}`);
        if (!tgId) {
            return await sock.sendMessage(from, { text: "Akun Anda belum terhubung dengan Telegram. Gunakan /link terlebih dahulu." }, { quoted: m });
        }

        const amount = parseInt(args[0]);
        if (!amount || isNaN(amount) || amount <= 0) {
            return await sock.sendMessage(from, { text: "Gunakan: /transfersakuranite {jumlah}" }, { quoted: m });
        }

        const currentSakuranite = getSakuranite(sender);
        if (currentSakuranite < amount) {
            return await sock.sendMessage(from, { text: "Sakuranite Anda tidak cukup!" }, { quoted: m });
        }

        const fee = Math.floor(amount * 0.1);
        const received = amount - fee;

        // Deduct from WA
        updateSakuranite(sender, currentSakuranite - amount);

        // Add to TG
        try {
            const { Database } = require("simpl.db");
            const tgDbPath = path.resolve(__dirname, "../../../database/tg/database.json");
            const tgDb = new Database({ dataFile: tgDbPath });
            const tgSakuranite = tgDb.get(`sakuranite.${tgId}`) || 0;
            tgDb.set(`sakuranite.${tgId}`, tgSakuranite + received);

            await sock.sendMessage(from, { text: `✅ Transfer Berhasil!\n\n➛ Jumlah: ${amount}\n➛ Biaya (10%): ${fee}\n➛ Diterima di TG: ${received}\n\nSakuranite Anda di WA sekarang: ${getSakuranite(sender)}` }, { quoted: m });

            if (global.tgBot) {
                await global.tgBot.telegram.sendMessage(tgId, `🔔 <b>NOTIFIKASI TRANSFER</b>\n\nAnda menerima transfer Sakuranite dari WhatsApp!\n\n➛ Jumlah: <b>${received}</b>\n\nSilakan cek melalui /me`, { parse_mode: "HTML" });
            }
        } catch (error) {
            console.error("Transfer failed:", error);
            // Rollback WA
            updateSakuranite(sender, getSakuranite(sender) + amount);
            await sock.sendMessage(from, { text: "❌ Terjadi kesalahan saat memproses transfer. Saldo Anda telah dikembalikan." }, { quoted: m });
        }
    }
};
