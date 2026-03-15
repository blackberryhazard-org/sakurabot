module.exports = {
    name: "groupstatus",
    aliases: ["upswgc"],
    category: "group",
    permissions: {
        admin: true,
        group: true
    },
    code: async (sock, m, { ctx, tools }) => {
        const input = ctx.text || ctx.quoted?.text || null;

        const checkMedia = tools.cmd.checkMedia(ctx.msg.messageType, ["image", "video"]);
        const checkQuotedMedia = tools.cmd.checkQuotedMedia(ctx.quoted?.messageType, ["image", "video"]);

        if (!input && !checkMedia && !checkQuotedMedia)
            return await ctx.reply(
                `${tools.msg.generateInstruction(["send"], ["text"])}\n` +
                tools.msg.generateCmdExample(ctx.used, "halo, dunia!")
            );

        try {
            let content;
            if (checkMedia || checkQuotedMedia) {
                const type = (checkMedia || checkQuotedMedia).replace("Message", "");
                const buffer = await (checkMedia ? ctx.msg.download() : ctx.quoted.download());
                content = {
                    [type]: buffer,
                    caption: input,
                    groupStatus: true
                };
            } else {
                content = {
                    text: input,
                    groupStatus: true
                };
            }
            await ctx.reply(content);

            await ctx.reply("ⓘ Group status berhasil dikirim!");
        } catch (error) {
            await tools.cmd.handleError(ctx, error);
        }
    }
};
