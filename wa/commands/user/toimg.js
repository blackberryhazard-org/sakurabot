module.exports = {
    name: "toimg",
    aliases: ["toimage"],
    code: async (sock, m, { from, ctx, config }) => {
        const q = m.message.extendedTextMessage?.contextInfo?.quotedMessage ? m.message.extendedTextMessage.contextInfo.quotedMessage : null;
        if (!q || !q.stickerMessage) {
            return await ctx.reply("Silakan reply sticker yang ingin diubah menjadi gambar.");
        }

        await ctx.reply(config.msg.wait);

        try {
            const buffer = await ctx.quoted.download();
            await sock.sendMessage(from, { image: buffer, caption: "Berhasil mengubah sticker menjadi gambar." }, { quoted: m });
        } catch (error) {
            console.error(error);
            await ctx.reply("Gagal mengubah sticker menjadi gambar.");
        }
    }
};
