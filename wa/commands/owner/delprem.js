module.exports = {
    name: "delprem",
    permissions: { owner: true },
    code: async (sock, m, { ctx, db }) => {
        const target = await ctx.target(["quoted", "mentioned", "text"]);
        if (!target) return ctx.reply("Silakan tag atau balas pesan user yang ingin dihapus dari premium.");

        let premiumUsers = db.get("premium") || [];
        if (!premiumUsers.includes(target)) {
            return ctx.reply("User tersebut tidak ada dalam daftar premium.");
        }

        premiumUsers = premiumUsers.filter(u => u !== target);
        db.set("premium", premiumUsers);
        ctx.reply(`User @${target.split("@")[0]} berhasil dihapus dari daftar premium.`, { mentions: [target] });
    }
};
