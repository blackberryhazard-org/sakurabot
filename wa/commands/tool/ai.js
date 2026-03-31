const axios = require('axios');
const config = require('../../../config.json');

module.exports = {
    name: 'ai',
    description: 'Tanya AI (ChatGPT)',
    category: 'tool',
    aliases: ['chatgpt', 'gpt'],
    code: async (sock, m, helpers) => {
        const { ctx } = helpers;

        try {
            // Get message text, handling both simple text and extended text
            const msgText = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
            const args = msgText.split(' ').slice(1);

            if (args.length === 0) {
                return ctx.reply('Silakan berikan pertanyaan. Contoh: /ai Siapa penemu lampu?');
            }

            const query = args.join(' ');

            const apikey = config.services?.neoxr?.apikey;
            if (!apikey || apikey === 'your-api-key-here') {
                return ctx.reply('API Key Neoxr belum dikonfigurasi di config.json (services.neoxr.apikey).');
            }

            await ctx.reply('⏳ Sedang memproses...');

            try {
                // Use axios as requested
                const url = `https://api.neoxr.eu/api/gpt-pro?q=${encodeURIComponent(query)}&apikey=${encodeURIComponent(apikey)}`;
                const response = await axios.get(url);

                if (response.data && response.data.status && response.data.data && response.data.data.message) {
                    return ctx.reply(response.data.data.message);
                } else {
                    return ctx.reply('Gagal mendapatkan respon dari AI. Format tidak sesuai.');
                }
            } catch (apiError) {
                console.error('Neoxr API Error:', apiError.message);
                return ctx.reply('Terjadi kesalahan saat menghubungi API AI. Coba lagi nanti.');
            }
        } catch (error) {
            console.error('Error in /ai command:', error);
            return ctx.reply(`Maaf, terjadi kesalahan: ${error.message}`);
        }
    }
};
