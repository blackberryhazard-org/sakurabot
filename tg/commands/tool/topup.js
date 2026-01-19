const crypto = require('crypto');

module.exports = {
    name: 'topup',
    aliases: [],
    category: 'tool',
    code: async (ctx, { pakasir, activeTopups, getCoins, updateCoins, db, config }) => {
        const userId = ctx.from.id;
        const args = ctx.message.text.split(' ').slice(1);

        if (activeTopups.has(userId)) {
            return ctx.reply('You already have an active top-up session. Please cancel it first with /cancel before starting a new one.');
        }

        if (args.length === 0 || isNaN(parseInt(args[0]))) {
            return ctx.reply('Please provide a valid number of coins to top up. Usage: /topup {amount}');
        }

        const coinAmount = parseInt(args[0]);

        if (coinAmount <= 0 || coinAmount % 25 !== 0) {
            return ctx.reply('Invalid amount. Please top up in multiples of 25 (e.g., 25, 50, 75).');
        }

        const price = (coinAmount / 25) * 1000;
        const orderId = `TOPUP-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${coinAmount}`;

        try {
            const payment = await pakasir.createPayment({
                order_id: orderId,
                amount: price,
                customer: {
                    name: ctx.from.first_name,
                    email: `${userId}@sakurabot.com`
                }
            });

            await ctx.reply(`Please complete the payment of Rp${price.toLocaleString('id-ID')} for ${coinAmount} coins here: ${payment.payment_url}\n\nYou have 10 minutes to complete the payment. Use /cancel to cancel this transaction.`);

            const watcher = pakasir.watchPayment(orderId, price, {
                interval: 3000,
                timeout: 600000,
                onStatusChange: async (payment) => {
                    if (payment.status === 'paid') {
                        watcher.stop();
                        activeTopups.delete(userId);

                        updateCoins(userId, getCoins(userId) + coinAmount);
                        await ctx.reply(`Your payment of Rp${price.toLocaleString('id-ID')} has been confirmed. ${coinAmount} coins have been added to your balance.`);

                        // Broadcast to newsletter channel
                        const broadcastMessage = `
✅ TRANSAKSI BERHASIL!

ID Transaksi: \`${orderId}\`
Item: ${coinAmount} Koin SakuraBot
Harga: Rp${price.toLocaleString('id-ID')}
Buyer: ${ctx.from.first_name} (\`${userId}\`)

Ketentuan:
- Item yang sudah dibeli/dibayar tidak dapat dikembalikan
- Untuk buyer, harap simpan baik baik pesan ini
                        `;

                        if (config.bot.tg_newsletterid) {
                            try {
                                await ctx.telegram.sendMessage(config.bot.tg_newsletterid, broadcastMessage, { parse_mode: 'Markdown' });
                            } catch (e) {
                                console.error('Failed to broadcast successful top-up:', e);
                            }
                        }
                    } else if (payment.status === 'canceled' || payment.status === 'expired') {
                        watcher.stop();
                        activeTopups.delete(userId);
                        await ctx.reply('Your top-up transaction has been canceled or has expired.');
                    }
                },
                onError: (error) => {
                    console.error('Error watching payment:', error);
                    activeTopups.delete(userId);
                    ctx.reply('An error occurred while monitoring your payment. Please contact an admin.');
                }
            });

            activeTopups.set(userId, { orderId, amount: price, watcher });

        } catch (error) {
            console.error('Failed to create payment:', error);
            return ctx.reply('Sorry, I failed to create a payment link. Please try again later.');
        }
    }
};
