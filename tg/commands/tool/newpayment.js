const { Pakasir } = require("pakasir-sdk");
const config = require("../../../config.json");
const crypto = require("crypto");

module.exports = {
    name: "newpayment",
    category: "tool",
    code: async (ctx, { isLeader }) => {
        if (!isLeader(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }
        try {
            const args = ctx.message.text.split(" ");
            const nominal = parseInt(args[1]);

            // Validate input
            if (isNaN(nominal) || nominal < 500) {
                return await ctx.reply("Silakan masukkan nominal pembayaran yang valid (minimal Rp500). Contoh: /newpayment 10000");
            }

            // Check for configuration
            const slug = config.services.pakasir.slug;
            const apikey = config.services.pakasir.apiKey;
            if (!slug || slug === "your-slug-here" || !apikey || apikey === "your-api-key-here") {
                return await ctx.reply("Fitur pembayaran belum dikonfigurasi oleh owner.");
            }

            await ctx.reply("Membuat permintaan pembayaran baru...");

            // Initialize Pakasir SDK
            const pakasir = new Pakasir({ slug, apikey });

            // Generate a secure random part for the Order ID using crypto
            const randomBytes = crypto.randomBytes(3).toString("hex").toUpperCase();
            const randomPart = `TRX-${randomBytes}`;
            const orderId = `${randomPart}-${nominal}`; // Embed amount in the order ID

            // Create payment
            const result = await pakasir.createPayment("qris", randomPart, nominal);

            // Check for success and the correct URL property
            if (result && result.payment_url) {
                let replyText = "✅ Pembayaran berhasil dibuat!\n\n";
                replyText += `◦  Order ID: ${orderId}\n`; // Show the full ID to the user
                replyText += `◦  Nominal: Rp${result.amount.toLocaleString("id-ID")}\n`;
                replyText += `◦  Status: ${result.status}\n\n`;
                replyText += "Gunakan Order ID di atas untuk memeriksa status (/infopayment) atau membatalkan (/cancelpayment) pembayaran.\n\n";
                replyText += `Silakan selesaikan pembayaran melalui tautan berikut:\n${result.payment_url}`;

                await ctx.reply(replyText);

            } else {
                await ctx.reply("Gagal membuat pembayaran. Pastikan konfigurasi benar dan coba lagi.");
            }

        } catch (error) {
            console.error(error);
            await ctx.reply(`Maaf, terjadi kesalahan saat memproses permintaan pembayaran: ${error.message}`);
        }
    }
};
