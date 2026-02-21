const path = require("path");

module.exports = {
    name: "unlink",
    category: "user",
    description: "Remove your WhatsApp-Telegram integration.",
    code: async (sock, m, { sender, from, linking }) => {
        if (!linking.getTgId(sender)) {
            return await sock.sendMessage(from, { text: "Akun Anda belum terhubung dengan Telegram." }, { quoted: m });
        }

        linking.unlink(sender, "wa");

        await sock.sendMessage(from, { text: "✅ Integrasi berhasil dihapus." }, { quoted: m });
    }
};
