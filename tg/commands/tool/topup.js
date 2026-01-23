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
                'Anda sudah memiliki sesi top-up aktif.\n' +
                'Gunakan /cancel sebelum memulai yang baru.'
            );
        }

        if (args.length === 0 || isNaN(parseInt(args[0]))) {
            return ctx.reply('Penggunaan: /topup {jumlah}');
        }

        const coinAmount = parseInt(args[0]);

        if (coinAmount <= 0 || coinAmount % 25 !== 0) {
            return ctx.reply(
                'Jumlah tidak valid.\nTop up harus dalam kelipatan 25.'
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

  `⏱ Anda punya waktu 10 menit untuk menyelesaikan pembayaran.\n` +

  `Gunakan /cancel untuk membatalkan.`,

  { parse_mode: 'HTML' }
);

            const watcher = watchPaymentFetch({
                project: process.env.PAKASIR_SLUG,
                amount: price,
                orderId: randomPart,
                apiKey: process.env.PAKASIR_APIKEY,

                onPaid: async (trx) => {
                    activeTopups.delete(userId);

                    updateCoins(
                        userId,
                        getCoins(userId) + coinAmount
                    );

                    await ctx.reply(
                        `✅ <b>PEMBAYARAN TERKONFIRMASI</b>\n\n` +
                        `${coinAmount} koin telah ditambahkan ke saldo Anda.`,
                        { parse_mode: 'HTML' }
                    );

                    const broadcastMessage = `
✅ <b>TRANSAKSI BERHASIL!</b>

<b>ID Transaksi:</b> <code>${orderId}</code>
<b>Item:</b> ${coinAmount} Koin SakuraBot
<b>Harga:</b> Rp${price.toLocaleString('id-ID')}
<b>Metode:</b> ${trx.payment_method}
<b>Waktu:</b> ${trx.completed_at}
<b>Pembeli:</b> ${ctx.from.first_name} (<code>${userId}</code>)

<b>Ketentuan:</b>
- Item yang sudah dibeli/dibayar tidak dapat dikembalikan
                    `;

                    if (config.bot.tg_newsletterid) {
                        try {
                            await ctx.telegram.sendMessage(
                                config.bot.tg_newsletterid,
                                broadcastMessage,
                                { parse_mode: 'HTML' }
                            );
                        } catch (e) {
                            console.error('Broadcast error:', e);
                        }
                    }
                },

                onExpired: async () => {
                    activeTopups.delete(userId);
                    await ctx.reply('⏱ Transaksi kedaluwarsa.');
                },

                onError: async (err) => {
                    console.error('Watcher error:', err);
                    activeTopups.delete(userId);
                    await ctx.reply(
                        '❌ Terjadi kesalahan saat memeriksa pembayaran.\nHubungi admin.'
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
                '❌ Gagal membuat pembayaran.\\nSilakan coba lagi nanti.'
            );
        }
    }
};
