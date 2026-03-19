const crypto = require("crypto");
const fetch = require("node-fetch");
const { Markup } = require("telegraf");

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
                "https://app.pakasir.com/api/transactiondetail" +
                `?project=${project}` +
                `&amount=${amount}` +
                `&order_id=${orderId}` +
                `&api_key=${apiKey}`;

            const res = await fetch(url);
            const data = await res.json();

            if (!data.transaction) return;

            if (data.transaction.status === "completed") {
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
    name: "topup",
    aliases: [],
    category: "tool",
    code: async (ctx, { activeTopups }) => {
        const userId = ctx.from.id;
        const args = ctx.message.text.split(" ").slice(1);

        if (activeTopups.has(userId)) {
            return ctx.reply(
                "You already have an active top-up session.\n" +
                "Use /cancel before starting a new one."
            );
        }

        if (args.length === 0 || isNaN(parseInt(args[0]))) {
            return ctx.reply("Usage: /topup {amount}");
        }

        const coinAmount = parseInt(args[0]);

        if (coinAmount <= 0 || coinAmount % 25 !== 0) {
            return ctx.reply(
                "Invalid amount.\nTop up must be in multiples of 25."
            );
        }

        await ctx.reply(
            "Silakan pilih metode pembayaran:",
            Markup.inlineKeyboard([
                [Markup.button.callback("Pakasir (QRIS)", `topup:pakasir:${coinAmount}`)],
                [Markup.button.callback("Telegram Stars ⭐️", `topup:stars:${coinAmount}`)]
            ])
        );
    },
    callback: async (ctx, helpers) => {
        const { pakasir, activeTopups, getCoins, updateCoins, config, bot } = helpers;
        const data = ctx.callbackQuery?.data;
        if (!data || !data.startsWith("topup:")) return;

        const [, method, coinAmountStr] = data.split(":");
        const coinAmount = parseInt(coinAmountStr);
        const userId = ctx.from.id;

        if (method === "pakasir") {
            await ctx.answerCbQuery();

            const price = (coinAmount / 25) * 1000;
            const randomPart = `TRX-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
            const orderId = `${randomPart}-${price}`;

            try {
                const payment = await pakasir.createPayment(
                    "qris",
                    randomPart,
                    price
                );

                await ctx.editMessageText(
                    "💳 <b>TOP UP INVOICE (Pakasir)</b>\n\n" +
                    `Coins: <b>${coinAmount}</b>\n` +
                    `Price: <b>Rp${price.toLocaleString("id-ID")}</b>\n\n` +
                    `🔗 <a href="${payment.payment_url}">Klik di sini untuk bayar</a>\n\n` +
                    "⏱ You have 10 minutes to complete the payment.\n" +
                    "Use /cancel to cancel.",
                    { parse_mode: "HTML" }
                );

                const watcher = watchPaymentFetch({
                    project: config.services.pakasir.slug,
                    amount: price,
                    orderId: randomPart,
                    apiKey: config.services.pakasir.apiKey,

                    onPaid: async (trx) => {
                        activeTopups.delete(userId);

                        updateCoins(
                            userId,
                            getCoins(userId) + coinAmount
                        );

                        await bot.telegram.sendMessage(userId,
                            "✅ <b>PAYMENT CONFIRMED</b>\n\n" +
                            `${coinAmount} coins have been added to your balance.`,
                            { parse_mode: "HTML" }
                        );

                        const broadcastMessage = `
✅ <b>TRANSAKSI BERHASIL!</b>

ID Transaksi: <code>${orderId}</code>
Item: ${coinAmount} Koin SakuraBot
Harga: Rp${price.toLocaleString("id-ID")}
Metode: ${trx.payment_method}
Waktu: ${trx.completed_at}
Buyer: ${ctx.from.first_name} (<code>${userId}</code>)

Ketentuan:
- Item yang sudah dibeli/dibayar tidak dapat dikembalikan
                        `;

                        if (config.tgbot.newsletterId) {
                            try {
                                await bot.telegram.sendMessage(
                                    config.tgbot.newsletterId,
                                    broadcastMessage,
                                    { parse_mode: "HTML" }
                                );
                            } catch (e) {
                                console.error("Broadcast error:", e);
                            }
                        }
                    },

                    onExpired: async () => {
                        activeTopups.delete(userId);
                        await bot.telegram.sendMessage(userId, "⏱ Transaction expired.");
                    },

                    onError: async (err) => {
                        console.error("Watcher error:", err);
                        activeTopups.delete(userId);
                        await bot.telegram.sendMessage(userId,
                            "❌ Error while checking payment.\nContact admin."
                        );
                    }
                });

                activeTopups.set(userId, {
                    orderId,
                    amount: price,
                    watcher
                });

            } catch (err) {
                console.error("Create payment failed:", err);
                return ctx.reply(
                    "❌ Failed to create payment.\nPlease try again later."
                );
            }
        } else if (method === "stars") {
            await ctx.answerCbQuery();
            const priceStars = (coinAmount / 25) * 3;

            try {
                await ctx.replyWithInvoice({
                    title: `Top Up ${coinAmount} Coins`,
                    description: `Beli ${coinAmount} koin menggunakan Telegram Stars`,
                    payload: JSON.stringify({ userId, coinAmount, method: "stars" }),
                    provider_token: "", // Kosong untuk Stars
                    currency: "XTR",
                    prices: [{ label: `${coinAmount} Coins`, amount: priceStars }],
                    reply_markup: {
                        inline_keyboard: [[{ text: `Bayar ${priceStars} ⭐️`, pay: true }]]
                    }
                });
                await ctx.deleteMessage();
            } catch (e) {
                console.error("Stars invoice error:", e);
                await ctx.reply("❌ Gagal membuat invoice Telegram Stars.");
            }
        }
    }
};
