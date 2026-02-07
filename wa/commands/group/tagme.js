module.exports = {
    name: "tagme",
    category: "group",
    permissions: {
        group: true
    },
    code: async (sock, m, { ctx }) => {
        await ctx.reply({
            text: `@${ctx.getId(ctx.sender.jid)}`,
            mentions: [ctx.sender.jid]
        });
    }
};