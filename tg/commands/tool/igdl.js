module.exports = {
    name: "igdl",
    category: "tool",
    code: async (ctx, { config, tools }) => {
        const start = Date.now();
        const args = ctx.message.text.split(" ").slice(1);
        const url = args[0];

        if (!url) {
            return ctx.reply("Silakan berikan URL Instagram. Contoh: /igdl https://www.instagram.com/p/CXYZ/");
        }

        await ctx.reply(config.msg.wait);

        try {
            const instagram = await tools.utils.igdl(url);

            if (!instagram.success) {
                return ctx.reply("Gagal mengambil data dari Instagram. Pastikan URL benar dan postingan bersifat publik.");
            }

            const ping = Date.now() - start;
            let caption = "📌 DOWNLOAD RESULT\n\n";
            caption += "Username: " + instagram.data.username + "\n";
            caption += "URL: " + instagram.data.videoUrl + "\n\n";
            caption += "Selesai dalam " + ping + "ms";

            try {
                await ctx.replyWithVideo({ url: instagram.data.videoUrl }, {
                    caption,
                    supports_streaming: true
                });
            } catch {
                // If video sending fails, send as text
                await ctx.reply(caption);
            }
        } catch (err) {
            await ctx.reply("Terjadi kesalahan: " + err.message);
        }
    }
};
