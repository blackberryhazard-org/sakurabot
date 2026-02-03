const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'gacha',
    aliases: [],
    category: 'misc',
    code: async (ctx, { isOwner, getGachaTickets, updateGachaTickets, getSakuranite, updateSakuranite, db }) => {
        const userId = ctx.from.id;
        const gachaDir = path.resolve(__dirname, '../../gacha');

        if (!fs.existsSync(gachaDir)) {
            fs.mkdirSync(gachaDir, { recursive: true });
        }

        const files = fs.readdirSync(gachaDir);

        if (files.length < 5) {
            return ctx.reply('The gacha is not ready yet. There are not enough items.');
        }

        const userTickets = getGachaTickets(userId);

        if (!isOwner(userId)) {
            if (userTickets < 1) {
                return ctx.reply('You don\'t have any gacha tickets. Use the /daily command to get more.');
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
                const sakuraniteAmount = amount * 100;
                if (!isOwner(userId)) {
                    updateSakuranite(userId, getSakuranite(userId) + sakuraniteAmount);
                    resultMessage += `Kamu memenangkan ${sakuraniteAmount} Sakuranite!`;
                } else {
                    resultMessage += `Kamu memenangkan ${sakuraniteAmount} Sakuranite! (Hanya untuk User)`;
                }
                return ctx.reply(resultMessage);
            }
        }

        if (randomFile.toUpperCase().startsWith('SAKURANITE-')) {
            const amount = parseInt(randomFile.split('-')[1], 10);
            if (!isNaN(amount)) {
                if (!isOwner(userId)) {
                    updateSakuranite(userId, getSakuranite(userId) + amount);
                    resultMessage += `Kamu memenangkan ${amount} Sakuranite!`;
                } else {
                    resultMessage += `Kamu memenangkan ${amount} Sakuranite! (Hanya untuk User)`;
                }
                return ctx.reply(resultMessage);
            }
        }

        resultMessage += `Kamu memenangkan ${randomFile}!`;
        await ctx.reply(resultMessage);

        try {
            await ctx.replyWithDocument({ source: filePath });
        } catch (error) {
            console.error('Error sending gacha file:', error);
            await ctx.reply('An error occurred while sending the gacha item.');
        }
    }
};
