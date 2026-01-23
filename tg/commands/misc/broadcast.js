module.exports = {
    name: 'broadcast',
    category: 'misc',
    description: 'Kirim pesan ke semua pengguna. Membutuhkan koin.',
    code: async (ctx, { isOwner, isPremium, getCoins, updateCoins, db }) => {
        const userId = ctx.from.id;
        const message = ctx.message.text.split(' ').slice(1).join(' ');

        if (!message) {
            return ctx.reply('Harap berikan pesan untuk disiarkan.');
        }

        // Tentukan biaya
        let cost = 10; // Biaya default untuk pengguna biasa
        if (isPremium(userId)) {
            cost = 5;
        }
        if (isOwner(userId)) {
            cost = 0;
        }

        const userCoins = getCoins(userId);

        // Periksa apakah pengguna mampu
        if (userCoins < cost) {
            return ctx.reply(`Anda tidak punya cukup koin untuk siaran. Anda butuh ${cost} koin, tetapi Anda hanya punya ${userCoins}.`);
        }

        const users = db.get('users');
        if (!users || users.length === 0) {
            return ctx.reply('Tidak ada pengguna untuk disiarkan.');
        }

        // Kurangi koin jika bukan pemilik
        if (!isOwner(userId)) {
            updateCoins(userId, userCoins - cost);
        }

        let successCount = 0;
        let failureCount = 0;

        await ctx.reply(`Memulai siaran ke ${users.length} pengguna...`);

        for (const targetId of users) {
            try {
                // Hindari mengirim ke pengguna yang memulai siaran untuk mencegah spamming diri sendiri
                if (targetId !== userId) {
                    await ctx.telegram.sendMessage(targetId, message);
                    successCount++;
                }
            } catch (error) {
                console.error(`Gagal mengirim pesan ke pengguna ${targetId}:`, error.description);
                failureCount++;
            }
        }

        // Pengirim juga dianggap "sukses", jadi kita tambahkan 1
        successCount++;

        let feedback = `Siaran selesai.\n✅ Terkirim ke ${successCount} pengguna.\n❌ Gagal untuk ${failureCount} pengguna.`;
        if (!isOwner(userId)) {
            feedback += `\n\nAnda dikenakan biaya ${cost} koin. Saldo baru Anda adalah ${getCoins(userId)}.`;
        }
        ctx.reply(feedback);
    }
};
