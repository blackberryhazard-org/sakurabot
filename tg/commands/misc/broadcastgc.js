module.exports = {
    name: 'broadcastgc',
    category: 'misc',
    description: 'Siarkan pesan ke semua grup terdaftar. Membutuhkan koin.',
    code: async (ctx, { isOwner, isPremium, getCoins, updateCoins, db }) => {
        const userId = ctx.from.id;
        const message = ctx.message.text.split(' ').slice(1).join(' ');

        if (!message) {
            return ctx.reply('Penggunaan: /broadcastgc {pesan}');
        }

        const groups = db.get('groups');
        if (!groups || groups.length === 0) {
            return ctx.reply('Tidak ada grup yang terdaftar untuk siaran.');
        }

        // Tentukan biaya per grup
        let costPerGroup = 2; // Default untuk pengguna biasa
        if (isPremium(userId)) {
            costPerGroup = 1;
        }
        if (isOwner(userId)) {
            costPerGroup = 0;
        }

        const totalCost = groups.length * costPerGroup;
        const userCoins = getCoins(userId);

        // Periksa apakah pengguna mampu
        if (userCoins < totalCost) {
            return ctx.reply(`Anda tidak punya cukup koin. Anda butuh ${totalCost} koin (${costPerGroup} per grup), tetapi Anda hanya punya ${userCoins}.`);
        }

        // Kurangi koin jika bukan pemilik
        if (!isOwner(userId)) {
            updateCoins(userId, userCoins - totalCost);
        }

        let successCount = 0;
        let failureCount = 0;

        await ctx.reply(`Memulai siaran ke ${groups.length} grup...`);

        for (const groupId of groups) {
            try {
                await ctx.telegram.sendMessage(groupId, message);
                successCount++;
            } catch (error) {
                console.error(`Gagal mengirim pesan ke grup ${groupId}:`, error);
                failureCount++;
            }
        }

        let feedback = `Siaran selesai.\n✅ Terkirim ke ${successCount} grup.\n❌ Gagal untuk ${failureCount} grup.`;
        if (!isOwner(userId)) {
            feedback += `\n\nAnda dikenakan biaya ${totalCost} koin. Saldo baru Anda adalah ${getCoins(userId)}.`;
        }

        ctx.reply(feedback);
    }
};
