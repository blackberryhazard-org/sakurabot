module.exports = {
    name: "sticker",
    aliases: ["s"],
    code: async (sock, m, { from, downloadContentFromMessage, Sticker, StickerTypes, config, prefix, ctx }) => {
        const q = m.message.extendedTextMessage?.contextInfo?.quotedMessage ? m.message.extendedTextMessage.contextInfo.quotedMessage : m.message;
        const qType = Object.keys(q)[0];
        const mediaMessage = q[qType] || q;
        const mime = mediaMessage?.mimetype || "";

        if (/image|video/.test(mime)) {
            await sock.sendMessage(from, { text: config.msg.wait }, { quoted: m });

            const messageType = qType.replace("Message", "");
            // Fix for extendedText when quoting image/video
            const downloadType = messageType === "extendedText" ? (mime.split("/")[0]) : messageType;

            let buffer;
            try {
                if (m.message.extendedTextMessage?.contextInfo?.quotedMessage) {
                    buffer = await ctx.quoted.download();
                } else {
                    buffer = await ctx.msg.download();
                }
            } catch (e) {
                // Fallback to manual download if ctx fails
                const stream = await downloadContentFromMessage(mediaMessage, downloadType);
                buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
            }

            const sticker = new Sticker(buffer, {
                pack: config.sticker.packname || config.bot.name,
                author: config.sticker.author || "SakuraBot",
                type: StickerTypes.FULL,
                categories: ["🤩", "🎉"],
                quality: 50,
            });

            await sock.sendMessage(from, { sticker: await sticker.toBuffer() }, { quoted: m });
        } else {
            await sock.sendMessage(from, { text: `Reply atau kirim gambar/video dengan ${prefix}sticker` }, { quoted: m });
        }
    }
};
