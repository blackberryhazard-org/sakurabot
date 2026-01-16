const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'gacha',
    aliases: [],
    category: 'misc',
    code: async (ctx, { isOwner, isPremium, getCoins, updateCoins, db }) => {
        const userId = ctx.from.id;
        const gachaDir = path.resolve(__dirname, '../../gacha');

        if (!fs.existsSync(gachaDir)) {
            fs.mkdirSync(gachaDir, { recursive: true });
        }

        const files = fs.readdirSync(gachaDir);

        if (files.length < 5) {
            return ctx.reply('The gacha is not ready yet. There are not enough items.');
        }

        const userCoins = getCoins(userId);
        let cost = 10;
        if (isPremium(userId)) {
            cost = 5;
        }
        if (isOwner(userId)) {
            cost = 0;
        }

        if (userCoins < cost) {
            return ctx.reply(`You don't have enough coins to play the gacha. You need ${cost} coins.`);
        }

        if (!isOwner(userId)) {
            updateCoins(userId, userCoins - cost);
        }

        const randomFile = files[Math.floor(Math.random() * files.length)];
        const filePath = path.join(gachaDir, randomFile);

        if (randomFile.toUpperCase() === 'ZONK') {
            return ctx.reply('You got ZONK! Better luck next time.');
        }

        if (randomFile.toUpperCase().startsWith('COINS-')) {
            const amount = parseInt(randomFile.split('-')[1], 10);
            if (!isNaN(amount)) {
                updateCoins(userId, getCoins(userId) + amount);
                return ctx.reply(`Congratulations! You won ${amount} coins.`);
            }
        }

        try {
            await ctx.replyWithDocument({ source: filePath });
        } catch (error) {
            console.error('Error sending gacha file:', error);
            await ctx.reply('An error occurred while sending the gacha item.');
        }
    }
};
