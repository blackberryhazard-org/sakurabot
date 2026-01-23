const { Markup } = require('telegraf');

const COOLDOWN_REGULAR_HOURS = 48;
const COOLDOWN_PREMIUM_HOURS = 24;
const COOLDOWN_BYPASS_COST = 50;

function msToTime(ms) {
    let seconds = Math.floor((ms / 1000) % 60);
    let minutes = Math.floor((ms / (1000 * 60)) % 60);
    let hours = Math.floor(ms / (1000 * 60 * 60));

    let str = "";
    if (hours > 0) str += `${hours} jam `;
    if (minutes > 0) str += `${minutes} menit `;
    if (seconds > 0) str += `${seconds} detik`;

    return str.trim();
}

module.exports = {
    name: 'broadcastch',
    category: 'misc',
    description: 'Kirim pesan ke semua channel terdaftar.',
    code: async (ctx, { isOwner, isPremium, getCoins, updateCoins, db }) => {
        const userId = ctx.from.id;
        const message = ctx.message.text.split(' ').slice(1).join(' ');

        if (!message) {
            return ctx.reply('Harap berikan pesan untuk disiarkan ke channel.');
        }

        const channels = db.get('channels') || [];
        if (channels.length === 0) {
            return ctx.reply('Tidak ada channel yang terdaftar untuk siaran.');
        }

        if (isOwner(userId)) {
            // Owner bypasses all checks
            return broadcastMessage(ctx, message, channels, 0, userId, getCoins);
        }

        const cooldowns = db.get('broadcastch_cooldown') || {};
        const lastBroadcast = cooldowns[userId] || 0;
        const now = Date.now();

        const cooldownHours = isPremium(userId) ? COOLDOWN_PREMIUM_HOURS : COOLDOWN_REGULAR_HOURS;
        const cooldownMs = cooldownHours * 60 * 60 * 1000;

        const timeSinceLast = now - lastBroadcast;

        if (timeSinceLast < cooldownMs) {
            const remainingMs = cooldownMs - timeSinceLast;
            const userCoins = getCoins(userId);

            if (userCoins >= COOLDOWN_BYPASS_COST) {
                return ctx.reply(
                    `Anda sedang dalam cooldown selama ${msToTime(remainingMs)} lagi. Apakah Anda ingin menggunakan ${COOLDOWN_BYPASS_COST} koin untuk melewatinya?`,
                    Markup.inlineKeyboard([
                        Markup.button.callback('Ya, gunakan 50 koin', `bypass_bch_${userId}`),
                        Markup.button.callback('Tidak, saya akan menunggu', 'cancel_bypass')
                    ])
                );
            } else {
                return ctx.reply(`Anda sedang dalam cooldown selama ${msToTime(remainingMs)} lagi. Anda juga tidak memiliki cukup koin (${COOLDOWN_BYPASS_COST} dibutuhkan) untuk melewatinya.`);
            }
        }

        // If not on cooldown, proceed with broadcast
        const broadcastResult = await broadcastMessage(ctx, message, channels, 0, userId, getCoins);
        if (broadcastResult.success > 0) {
            cooldowns[userId] = Date.now();
            db.set('broadcastch_cooldown', cooldowns);
        }
        return;
    },

    callback: async (ctx, { isOwner, isPremium, getCoins, updateCoins, db }) => {
        const userId = ctx.from.id;
        const query = ctx.callbackQuery.data;

        if (query === 'cancel_bypass') {
            return ctx.editMessageText('Siaran dibatalkan. Harap tunggu hingga cooldown Anda berakhir.');
        }

        if (query.startsWith('bypass_bch_')) {
            const targetUserId = parseInt(query.split('_')[2]);

            if (userId !== targetUserId) {
                return ctx.answerCbQuery('Ini bukan untukmu.', { show_alert: true });
            }

            const userCoins = getCoins(userId);
            if (userCoins < COOLDOWN_BYPASS_COST) {
                return ctx.editMessageText(`Anda tidak lagi memiliki cukup koin untuk melewati cooldown. Anda butuh ${COOLDOWN_BYPASS_COST}, tetapi Anda hanya punya ${userCoins}.`);
            }

            await ctx.editMessageText('Cooldown dilewati. Memulai siaran...');

            // Deduct coins
            updateCoins(userId, userCoins - COOLDOWN_BYPASS_COST);

            const originalMessageText = ctx.callbackQuery.message.reply_to_message.text;
            const message = originalMessageText.split(' ').slice(1).join(' ');
            const channels = db.get('channels') || [];

            const broadcastResult = await broadcastMessage(ctx, message, channels, COOLDOWN_BYPASS_COST, userId, getCoins);
            if (broadcastResult.success > 0) {
                 const cooldowns = db.get('broadcastch_cooldown') || {};
                 cooldowns[userId] = Date.now();
                 db.set('broadcastch_cooldown', cooldowns);
            }
        }
    }
};

async function broadcastMessage(ctx, message, channels, cost, userId, getCoins) {
    let successCount = 0;
    let failureCount = 0;
    const totalChannels = channels.length;

    await ctx.reply(`Memulai siaran channel ke ${totalChannels} channel...`);

    for (const channelId of channels) {
        try {
            await ctx.telegram.sendMessage(channelId, message);
            successCount++;
        } catch (error) {
            console.error(`Gagal mengirim pesan ke channel ${channelId}:`, error.description);
            failureCount++;
        }
    }

    let feedback = `Siaran channel selesai.\n✅ Terkirim ke ${successCount} channel.\n❌ Gagal untuk ${failureCount} channel.`;
    if (cost > 0) {
        feedback += `\n\nAnda dikenakan biaya ${cost} koin. Saldo baru Anda adalah ${getCoins(userId)}.`;
    }
    await ctx.reply(feedback);
    return { success: successCount, failed: failureCount };
}
