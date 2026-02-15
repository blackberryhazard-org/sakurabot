module.exports = {
    name: "link",
    category: "user",
    description: "Integrate your WhatsApp account with Telegram.",
    code: async (sock, m, { args, from, sender, waBot, linking }) => {
        const tgId = args[0];
        if (!tgId || isNaN(tgId)) {
            return await sock.sendMessage(from, { text: "Gunakan: /link {id_telegram}\n\nAnda bisa mendapatkan ID Telegram melalui command /me di bot Telegram." }, { quoted: m });
        }

        if (linking.getTgId(sender)) {
            return await sock.sendMessage(from, { text: `Akun Anda sudah terhubung dengan ID Telegram ${linking.getTgId(sender)}.\nGunakan /unlink jika ingin menghapus.` }, { quoted: m });
        }

        if (!global.tgBot) {
            return await sock.sendMessage(from, { text: "Bot Telegram sedang tidak aktif. Silakan hubungi owner." }, { quoted: m });
        }

        // Generate 4-digit code
        const code = Math.floor(1000 + Math.random() * 9000).toString();

        try {
            await global.tgBot.telegram.sendMessage(tgId, `🔔 <b>VERIFIKASI INTEGRASI</b>\n\nSeseorang mencoba menghubungkan akun WhatsApp dengan ID Telegram ini.\n\nKode Verifikasi Anda: <b>${code}</b>\n\nJika ini bukan Anda, abaikan pesan ini.`, { parse_mode: "HTML" });

            waBot.sessions.set(sender, {
                type: "linking",
                tgId: tgId,
                code: code,
                attempts: 0,
                expires: Date.now() + (5 * 60 * 1000) // 5 minutes
            });

            await sock.sendMessage(from, { text: `Kode verifikasi telah dikirim ke ID Telegram *${tgId}*.\n\nSilakan masukkan 4 digit kode tersebut di sini.`, mentions: [sender] }, { quoted: m });
        } catch (error) {
            console.error(error);
            await sock.sendMessage(from, { text: "Gagal mengirim pesan ke Telegram. Pastikan Anda sudah menjalankan /start di bot Telegram." }, { quoted: m });
        }
    }
};
