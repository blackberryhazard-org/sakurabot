module.exports = {
    name: "addmanager",
    permissions: { leader: true },
    code: async (sock, m, { ctx, db }) => {
        const target = await ctx.target(["quoted", "mentioned", "text"]);
        if (!target) return ctx.reply("Silakan tag atau balas pesan user yang ingin dijadikan manager.");

        const managers = db.get("managers") || [];
        if (managers.includes(target)) {
            return ctx.reply("User tersebut sudah menjadi manager.");
        }

        managers.push(target);
        db.set("managers", managers);
        ctx.reply(`User @${target.split("@")[0]} berhasil ditambahkan sebagai manager.`, { mentions: [target] });
    }
};
