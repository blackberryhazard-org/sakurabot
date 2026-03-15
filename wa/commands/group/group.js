module.exports = {
    name: "group",
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
                `${tools.msg.generateCmdExample(ctx.used, "open")}\n` +
                tools.msg.generateNotes([
                    `Ketik ${global.formatter.inlineCode(`${ctx.used.prefix + ctx.used.command} list`)} untuk melihat daftar.`
                ])
            );

        if (input.toLowerCase() === "list") {
            const listText = await tools.list.get("group");
            return await ctx.reply(listText);
        }

        try {
            switch (input.toLowerCase()) {
                case "open":
                    await ctx.group().setting("not_announcement");
                    break;
                case "close":
                    await ctx.group().setting("announcement");
                    break;
                case "lock":
                    await ctx.group().setting("locked");
                    break;
                case "unlock":
                    await ctx.group().setting("unlocked");
                    break;
                case "approve":
                    await ctx.group().joinApprovalMode("on");
                    break;
                case "disapprove":
                    await ctx.group().joinApprovalMode("off");
                    break;
                case "invite":
                    await ctx.group().memberAddMode("all_member_add");
                    break;
                case "restrict":
                    await ctx.group().memberAddMode("admin_add");
                    break;
                default:
                    return await ctx.reply(`ⓘ ${global.formatter.italic(`Setelan "${input}" tidak valid!`)}`);
            }

            await ctx.reply(`ⓘ ${global.formatter.italic("Berhasil mengubah setelan grup!")}`);
        } catch (error) {
            await tools.cmd.handleError(ctx, error);
        }
    }
};
