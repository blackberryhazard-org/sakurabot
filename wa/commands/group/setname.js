module.exports = {
    name: "setname",
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
                tools.msg.generateCmdExample(ctx.used, "SakuraBot Group")
            );

        try {
            await ctx.group().setSubject(input);

            await ctx.reply(`ⓘ ${global.formatter.italic("Berhasil mengubah nama grup!")}`);
        } catch (error) {
            await tools.cmd.handleError(ctx, error);
        }
    }
};
