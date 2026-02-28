const axios = require("axios");

module.exports = {
    name: "toimage",
    aliases: ["toimg", "topng"],
    category: "converter",
    code: async (sock, m, { ctx, tools }) => {
        if (!tools.cmd.checkQuotedMedia(ctx.quoted?.messageType, ["sticker"])) {
            return await ctx.reply(tools.msg.generateInstruction(["reply"], ["sticker"]));
        }

        await ctx.reply(global.config.msg.wait);

        try {
            const buffer = await ctx.quoted.download();
            // Using the external converter API as suggested by user
            const apiUrl = tools.api.createUrl("https://nekochii-converter.hf.space", "/webp2png");
            const response = await axios.post(apiUrl, {
                file: buffer.toString("base64")
            }, {
                params: { json: true }
            });

            const result = response.data.result;

            if (!result) {
                throw new Error("Gagal mengonversi stiker.");
            }

            await ctx.reply({
                image: {
                    url: result
                },
                mimetype: tools.mime.lookup("png")
            });
        } catch (error) {
            await tools.cmd.handleError(ctx, error, true);
        }
    }
};
