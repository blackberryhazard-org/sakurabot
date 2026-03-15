module.exports = {
    name: "promote",
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true
    },
    code: async (sock, m, { ctx, tools }) => {
        const target = await ctx.target(["quoted", "mentioned"]);

        if (!target)
            return await ctx.reply({
                text: `${tools.msg.generateInstruction(["send"], ["text"])}\n` +
                    `${tools.msg.generateCmdExample(ctx.used, "@6281234567891")}\n` +
                    tools.msg.generateNotes(["Balas/quote pesan untuk menjadikan pengirim sebagai akun target."]),
                mentions: ["6281234567891@s.whatsapp.net"]
            });

        if (await ctx.group().isAdmin(target)) return await ctx.reply(`ⓘ ${global.formatter.italic("Dia sudah menjadi admin!")}`);

        try {
            await ctx.group().promote(target);

            await ctx.reply(`ⓘ ${global.formatter.italic("Berhasil diangkat menjadi admin grup!")}`);
        } catch (error) {
            await tools.cmd.handleError(ctx, error);
        }
    }
};
