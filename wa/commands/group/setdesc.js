module.exports = {
    name: "setdesc",
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true
    },
    code: async (sock, m, { ctx, tools }) => {
        const input = ctx.text || null;

        if (!input)
            return await ctx.reply(
                `${tools.msg.generateInstruction(["send"], ["text"])}\n` +
                tools.msg.generateCmdExample(ctx.used, "Group description here")
            );

        try {
            await ctx.group().setDescription(input);

            await ctx.reply(`ⓘ ${global.formatter.italic("Berhasil mengubah deskripsi grup!")}`);
        } catch (error) {
            await tools.cmd.handleError(ctx, error);
        }
    }
};
