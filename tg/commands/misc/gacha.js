const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'gacha',
    aliases: [],
    category: 'misc',
    code: async (ctx, { isOwner, getGachaTickets, updateGachaTickets, getCoins, updateCoins, db }) => {
        const userId = ctx.from.id;
        const gachaDir = path.resolve(__dirname, '../../gacha');

        if (!fs.existsSync(gachaDir)) {
            fs.mkdirSync(gachaDir, { recursive: true });
        }

        const files = fs.readdirSync(gachaDir);

        if (files.length < 5) {
            return ctx.reply('Gacha belum siap. Item tidak cukup.');
        }

        const userTickets = getGachaTickets(userId);

        if (!isOwner(userId)) {
            if (userTickets < 1) {
                return ctx.reply('Anda tidak punya tiket gacha. Gunakan perintah /daily untuk mendapatkan lebih banyak.');
            }
            updateGachaTickets(userId, userTickets - 1);
        }

        const randomFile = files[Math.floor(Math.random() * files.length)];
        const filePath = path.join(gachaDir, randomFile);

        let resultMessage = '🎁 HASIL GACHA\n\n';

        if (randomFile.toUpperCase() === 'ZONK') {
            resultMessage += 'Maaf, kamu belum beruntung. Coba lagi!';
            return ctx.reply(resultMessage);
        }

        if (randomFile.toUpperCase().startsWith('COINS-')) {
            const amount = parseInt(randomFile.split('-')[1], 10);
            if (!isNaN(amount)) {
                updateCoins(userId, getCoins(userId) + amount);
                resultMessage += `Kamu memenangkan ${amount} koin!`;
                return ctx.reply(resultMessage);
            }
        }

        resultMessage += `Kamu memenangkan ${randomFile}!`;
        await ctx.reply(resultMessage);

        try {
            await ctx.replyWithDocument({ source: filePath });
        } catch (error) {
            console.error('Error sending gacha file:', error);
            await ctx.reply('Terjadi kesalahan saat mengirim item gacha.');
        }
    }
};
