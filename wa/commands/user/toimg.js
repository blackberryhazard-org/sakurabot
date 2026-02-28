const Jimp = require("jimp");

module.exports = {
    name: "toimg",
    aliases: ["toimage"],
    code: async (sock, m, { from, ctx, config }) => {
        const q = m.message.extendedTextMessage?.contextInfo?.quotedMessage ? m.message.extendedTextMessage.contextInfo.quotedMessage : null;
        if (!q || !q.stickerMessage) {
            return await ctx.reply("Silakan reply sticker yang ingin diubah menjadi gambar.");
        }

        if (q.stickerMessage.isAnimated) {
            return await ctx.reply("Maaf, saat ini belum mendukung konversi sticker animasi menjadi gambar/GIF.");
        }

        await ctx.reply(config.msg.wait);

        try {
            const buffer = await ctx.quoted.download();
            const image = await Jimp.read(buffer);
            const outputBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
            await sock.sendMessage(from, { image: outputBuffer, caption: "Berhasil mengubah sticker menjadi gambar." }, { quoted: m });
        } catch (error) {
            console.error(error);
            await ctx.reply("Gagal mengubah sticker menjadi gambar.");
        }
    }
};
