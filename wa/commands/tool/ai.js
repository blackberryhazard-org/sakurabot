const NeoxrApi = require('@neoxr/api');
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

            const Api = new NeoxrApi('https://api.neoxr.eu/api', apikey);

            await ctx.reply('⏳ Sedang memproses...');

            const json = await Api.neoxr('/gptPro', { "q": query });

            if (json && json.status && json.data && json.data.message) {
                return ctx.reply(json.data.message);
            } else {
                return ctx.reply('Gagal mendapatkan respon dari AI. Coba lagi nanti.');
            }
        } catch (error) {
            console.error('Error in /ai command:', error);
            return ctx.reply(`Maaf, terjadi kesalahan: ${error.message}`);
        }
    }
};
