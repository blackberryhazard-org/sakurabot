module.exports = {
    name: "listpendingmembers",
    aliases: ["pendingmembers"],
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true
    },
    code: async (sock, m, { ctx }) => {
        const pending = await ctx.group().pendingMembers();

        if (pending.length === 0) return await ctx.reply(`ⓘ ${formatter.italic("Tidak ada anggota yang menunggu persetujuan.")}`);

        try {
            const resultText = pending.map((member, index) => `${index + 1}. ${ctx.getId(member.jid)}`).join("\n");

            await ctx.reply(resultText.trim());
        } catch (error) {
            await tools.cmd.handleError(ctx, error);
        }
    }
};