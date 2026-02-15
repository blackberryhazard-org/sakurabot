module.exports = {
    name: "shop",
    category: "tool",
    description: "Beli item dengan Sakuranite.",
    code: async (ctx, { isOwner, getSakuranite, updateSakuranite, getGachaTickets, updateGachaTickets }) => {
        const userId = ctx.from.id;

        if (isOwner(userId)) {
            return ctx.reply("Owner tidak memiliki Sakuranite untuk berbelanja di shop.");
        }

        const args = ctx.message.text.split(" ").slice(1);

        if (args.length === 0) {
            const catalog = "🛒 *SHOP CATALOG* 🛒\n\n" +
                "1. Gacha Ticket - 🎫 50 Sakuranite\n\n" +
                "Gunakan `/shop buy gacha {jumlah}` untuk membeli.";
            return ctx.replyWithMarkdown(catalog);
        }

        if (args[0].toLowerCase() === "buy") {
            if (args.length < 3 || args[1].toLowerCase() !== "gacha") {
                return ctx.reply("Penggunaan: /shop buy gacha {jumlah}");
            }

            const amount = parseInt(args[2], 10);
            if (isNaN(amount) || amount <= 0) {
                return ctx.reply("Jumlah harus berupa angka positif.");
            }

            const pricePerTicket = 50;
            const totalCost = amount * pricePerTicket;

            const userSakuranite = getSakuranite(userId);
            if (userSakuranite < totalCost) {
                return ctx.reply(`Sakuranite kamu tidak cukup. Total harga: ${totalCost}, Saldo saat ini: ${userSakuranite}`);
            }

            updateSakuranite(userId, userSakuranite - totalCost);
            updateGachaTickets(userId, getGachaTickets(userId) + amount);

            return ctx.reply(`Berhasil membeli ${amount} Gacha Ticket seharga ${totalCost} Sakuranite!\nSisa Sakuranite: ${userSakuranite - totalCost}`);
        }

        return ctx.reply("Penggunaan: /shop atau /shop buy gacha {jumlah}");
    }
};
