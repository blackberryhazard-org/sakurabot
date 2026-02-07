module.exports = {
    name: 'delmanager',
    permissions: { leader: true },
    code: async (sock, m, { ctx, db }) => {
        const target = await ctx.target(["quoted", "mentioned", "text"]);
        if (!target) return ctx.reply("Silakan tag atau balas pesan user yang ingin dihapus dari manager.");

        let managers = db.get('managers') || [];
        if (!managers.includes(target)) {
            return ctx.reply("User tersebut tidak ada dalam daftar manager.");
        }

        managers = managers.filter(u => u !== target);
        db.set('managers', managers);
        ctx.reply(`User @${target.split('@')[0]} berhasil dihapus dari daftar manager.`, { mentions: [target] });
    }
};
