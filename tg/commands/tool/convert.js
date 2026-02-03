module.exports = {
    name: 'convert',
    category: 'tool',
    description: 'Convert Sakuranite to Coins.',
    code: async (ctx, { isOwner, getCoins, updateCoins, getSakuranite, updateSakuranite }) => {
        const userId = ctx.from.id;

        if (isOwner(userId)) {
            return ctx.reply('Owner tidak diperbolehkan menggunakan fitur ini.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 2 || args[0].toLowerCase() !== 'sakuranite') {
            return ctx.reply('Penggunaan: /convert sakuranite {jumlah_sakuranite}');
        }

        const amount = parseInt(args[1], 10);
        if (isNaN(amount) || amount <= 0) {
            return ctx.reply('Jumlah Sakuranite harus berupa angka positif.');
        }

        if (amount % 100 !== 0) {
            return ctx.reply('Jumlah Sakuranite harus kelipatan 100 (contoh: 100, 200, 300).');
        }

        const userSakuranite = getSakuranite(userId);
        if (userSakuranite < amount) {
            return ctx.reply(`Sakuranite kamu tidak cukup. Saldo saat ini: ${userSakuranite}`);
        }

        const coinsToAdd = amount / 100;
        const currentCoins = getCoins(userId);

        updateSakuranite(userId, userSakuranite - amount);
        updateCoins(userId, currentCoins + coinsToAdd);

        return ctx.reply(`Berhasil mengonversi ${amount} Sakuranite menjadi ${coinsToAdd} Coins!\nSaldo Sakuranite: ${userSakuranite - amount}\nSaldo Coins: ${currentCoins + coinsToAdd}`);
    }
};
