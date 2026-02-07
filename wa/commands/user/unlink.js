const path = require('path');

module.exports = {
    name: 'unlink',
    category: 'user',
    description: 'Remove your WhatsApp-Telegram integration.',
    code: async (sock, m, { sender, from, db }) => {
        const tgId = db.get(`links.${sender}`);
        if (!tgId) {
            return await sock.sendMessage(from, { text: 'Akun Anda belum terhubung dengan Telegram.' }, { quoted: m });
        }

        // Remove from WA database
        db.delete(`links.${sender}`);

        // Remove from TG database
        try {
            const { Database } = require('simpl.db');
            const tgDbPath = path.resolve(__dirname, '../../../database/tg/database.json');
            const tgDb = new Database({ dataFile: tgDbPath });
            tgDb.delete(`links.${tgId}`);
        } catch (error) {
            console.error('Failed to unlink from TG database:', error);
        }

        await sock.sendMessage(from, { text: '✅ Integrasi berhasil dihapus.' }, { quoted: m });
    }
};
