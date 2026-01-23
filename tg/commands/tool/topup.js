const crypto = require('crypto');
const fetch = require('node-fetch');

function watchPaymentFetch({
    project,
    amount,
    orderId,
    apiKey,
    interval = 3000,
    timeout = 600000,
    onPaid,
    onExpired,
    onError
}) {
    const startTime = Date.now();

    const timer = setInterval(async () => {
        try {
            if (Date.now() - startTime > timeout) {
                clearInterval(timer);
                return onExpired();
            }

            const url =
                `https://app.pakasir.com/api/transactiondetail` +
                `?project=${project}` +
                `&amount=${amount}` +
                `&order_id=${orderId}` +
                `&api_key=${apiKey}`;

            const res = await fetch(url);
            const data = await res.json();

            if (!data.transaction) return;

            if (data.transaction.status === 'completed') {
                clearInterval(timer);
                onPaid(data.transaction);
            }

        } catch (err) {
            clearInterval(timer);
            onError(err);
        }
    }, interval);

    return {
        stop: () => clearInterval(timer)
    };
}

module.exports = {
    name: 'topup',
    aliases: [],
    category: 'tool',
    code: async (ctx, { pakasir, activeTopups, getCoins, updateCoins, config }) => {
        const userId = ctx.from.id;
        const args = ctx.message.text.split(' ').slice(1);

        if (activeTopups.has(userId)) {
            return ctx.reply(
                'You already have an active top-up session.\n' +
                'Use /cancel before starting a new one.'
            );
        }

        if (args.length === 0 || isNaN(parseInt(args[0]))) {
            return ctx.reply('Usage: /topup {amount}');
        }

        const coinAmount = parseInt(args[0]);

        if (coinAmount <= 0 || coinAmount % 25 !== 0) {
            return ctx.reply(
                'Invalid amount.\nTop up must be in multiples of 25.'
            );
        }

        const price = (coinAmount / 25) * 1000;
        const randomPart = `TRX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const orderId = `${randomPart}-${price}`;

        try {
            const payment = await pakasir.createPayment(
                'qris',
                randomPart,
                price
            );

            await ctx.reply(
  `💳 <b>TOP UP INVOICE</b>\n\n` +

  `Coins: <b>${coinAmount}</b>\n` +

  `Price: <b>Rp${price.toLocaleString('id-ID')}</b>\n\n` +

  `🔗 <a href="${payment.payment_url}">Klik di sini untuk bayar</a>\n\n` +

  `⏱ You have 10 minutes to complete the payment.\n` +

  `Use /cancel to cancel.`,

  { parse_mode: 'HTML' }
);

            const watcher = watchPaymentFetch({
                project: config.pakasir.slug,
                amount: price,
                orderId: randomPart,
                apiKey: config.pakasir.apikey,

                onPaid: async (trx) => {
                    activeTopups.delete(userId);

                    updateCoins(
                        userId,
                        getCoins(userId) + coinAmount
                    );

                    await ctx.reply(
                        `✅ *PAYMENT CONFIRMED*\n\n` +
                        `${coinAmount} coins have been added to your balance.`,
                        { parse_mode: 'Markdown' }
                    );

                    const broadcastMessage = `
✅ TRANSAKSI BERHASIL!

ID Transaksi: \`${orderId}\`
Item: ${coinAmount} Koin SakuraBot
Harga: Rp${price.toLocaleString('id-ID')}
Metode: ${trx.payment_method}
Waktu: ${trx.completed_at}
Buyer: ${ctx.from.first_name} (\`${userId}\`)

Ketentuan:
- Item yang sudah dibeli/dibayar tidak dapat dikembalikan
                    `;

                    if (config.bot.tg_newsletterid) {
                        try {
                            await ctx.telegram.sendMessage(
                                config.bot.tg_newsletterid,
                                broadcastMessage,
                                { parse_mode: 'Markdown' }
                            );
                        } catch (e) {
                            console.error('Broadcast error:', e);
                        }
                    }
                },

                onExpired: async () => {
                    activeTopups.delete(userId);
                    await ctx.reply('⏱ Transaction expired.');
                },

                onError: async (err) => {
                    console.error('Watcher error:', err);
                    activeTopups.delete(userId);
                    await ctx.reply(
                        '❌ Error while checking payment.\nContact admin.'
                    );
                }
            });

            activeTopups.set(userId, {
                orderId,
                amount: price,
                watcher
            });

        } catch (err) {
            console.error('Create payment failed:', err);
            return ctx.reply(
                '❌ Failed to create payment.\\nPlease try again later.'
            );
        }
    }
};
