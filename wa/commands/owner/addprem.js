module.exports = {
    name: 'addprem',
    permissions: { owner: true },
    code: async (sock, m, { ctx, db }) => {
        const target = await ctx.target(["quoted", "mentioned", "text"]);
        if (!target) return ctx.reply("Silakan tag atau balas pesan user yang ingin dijadikan premium.");

        const premiumUsers = db.get('premium') || [];
        if (premiumUsers.includes(target)) {
            return ctx.reply("User tersebut sudah menjadi premium.");
        }

        premiumUsers.push(target);
        db.set('premium', premiumUsers);
        ctx.reply(`User @${target.split('@')[0]} berhasil ditambahkan ke daftar premium.`, { mentions: [target] });
    }
};
