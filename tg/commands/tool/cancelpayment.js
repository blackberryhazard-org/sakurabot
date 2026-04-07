const { Pakasir } = require("pakasir-sdk");
const config = require("../../../config.js");

module.exports = {
    name: "cancelpayment",
    category: "tool",
    code: async (ctx, { isLeader }) => {
        if (!isLeader(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }
        try {
            const args = ctx.message.text.split(" ");
            const fullOrderId = args[1];

            if (!fullOrderId || !fullOrderId.includes("-")) {
                return await ctx.reply("Format Order ID tidak valid. Harap gunakan Order ID lengkap yang Anda terima. Contoh: /cancelpayment TRX-12345A-10000");
            }

            const parts = fullOrderId.split("-");
            const amount = parseInt(parts.pop(), 10);
            const orderId = parts.join("-");

            if (isNaN(amount)) {
                return await ctx.reply("Format Order ID tidak valid: nominal tidak ditemukan.");
            }

            const slug = config.services.pakasir.slug;
            const apikey = config.services.pakasir.apiKey;
            if (!slug || slug === "your-slug-here" || !apikey || apikey === "your-api-key-here") {
                return await ctx.reply("Fitur pembayaran belum dikonfigurasi oleh owner.");
            }

            await ctx.reply(`Mengirim permintaan pembatalan untuk Order ID: ${orderId}...`);

            const pakasir = new Pakasir({ slug, apikey });
            const result = await pakasir.cancelPayment(orderId, amount);

            if (result && result.status === "canceled") {
                await ctx.reply(`✅ Pembayaran untuk Order ID ${fullOrderId} berhasil dibatalkan.`);
            } else {
                await ctx.reply(`Gagal membatalkan pembayaran. Status saat ini: ${result.status || "Tidak Diketahui"}.`);
            }

        } catch (error) {
            console.error(error);
            await ctx.reply(`Maaf, terjadi kesalahan saat memproses permintaan pembatalan: ${error.message}`);
        }
    }
};
