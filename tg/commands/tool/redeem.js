module.exports = {
    name: "redeem",
    category: "tool",
    code: async (ctx, { db, isOwner, getGachaTickets, updateGachaTickets, getSakuranite, updateSakuranite, getMiningTickets, updateMiningTickets, config, bot }) => {
        const userId = ctx.from.id;
        const args = ctx.message.text.split(" ").slice(1);
        const code = args[0];

        if (!code) {
            return ctx.reply("Penggunaan: /redeem {kode}");
        }

        const redeemCodes = db.get("redeem_codes") || {}; const redeemCode = redeemCodes[code];

        if (!redeemCode) {
            return ctx.reply("Kode redeem tidak valid atau sudah kedaluwarsa.");
        }

        if (redeemCode.expiresAt && Date.now() > redeemCode.expiresAt) {
            const codesUpdate = db.get("redeem_codes") || {}; delete codesUpdate[code]; db.set("redeem_codes", codesUpdate);
            return ctx.reply("Kode redeem ini sudah kedaluwarsa.");
        }

        if (redeemCode.claimedBy.includes(userId)) {
            return ctx.reply("Anda sudah pernah menukarkan kode ini.");
        }

        if (redeemCode.quota > 0 && redeemCode.claimedBy.length >= redeemCode.quota) {
            return ctx.reply("Maaf, kuota untuk kode redeem ini sudah habis.");
        }

        let rewardMessage = "";
        if (redeemCode.type === "coins") {
            const sakuraniteAmount = redeemCode.amount * 100;
            if (!isOwner(userId)) {
                updateSakuranite(userId, getSakuranite(userId) + sakuraniteAmount);
                rewardMessage = `${sakuraniteAmount} Sakuranite`;
            } else {
                rewardMessage = `${sakuraniteAmount} Sakuranite (Hanya untuk User)`;
            }
        } else if (redeemCode.type === "sakuranite") {
            if (!isOwner(userId)) {
                updateSakuranite(userId, getSakuranite(userId) + redeemCode.amount);
                rewardMessage = `${redeemCode.amount} Sakuranite`;
            } else {
                rewardMessage = `${redeemCode.amount} Sakuranite (Hanya untuk User)`;
            }
        } else if (redeemCode.type === "gacha") {
            updateGachaTickets(userId, getGachaTickets(userId) + redeemCode.amount);
            rewardMessage = `${redeemCode.amount} tiket gacha`;
        } else if (redeemCode.type === "mining") {
            updateMiningTickets(userId, getMiningTickets(userId) + redeemCode.amount);
            rewardMessage = `${redeemCode.amount} tiket mining`;
        }

        redeemCode.claimedBy.push(userId);
        const redeemCodesUpdate = db.get("redeem_codes") || {}; redeemCodesUpdate[code] = redeemCode; db.set("redeem_codes", redeemCodesUpdate);

        await ctx.reply(`Selamat! Anda berhasil menukarkan kode dan mendapatkan ${rewardMessage}.`);

        if (config.tgbot.newsletterId) {
            const notificationText = `<i>${ctx.from.first_name} baru saja menukarkan kode ${code} dan mendapatkan ${rewardMessage}!</i>`;
            try {
                await bot.telegram.sendMessage(config.tgbot.newsletterId, notificationText, { parse_mode: "HTML" });
            } catch (e) {
                console.error(`Gagal mengirim notifikasi redeem: ${e.message}`);
            }
        }
    }
};
