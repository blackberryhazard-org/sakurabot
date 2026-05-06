export default (bot) => {
  bot.hears(/^\/redeem (.+)/, async (ctx) => {
    const { db, saveDB } = ctx.coinbot;
    const userId = ctx.from.id;
    const inputCode = ctx.match[1].trim().toUpperCase();

    if (!db.redeemCodes || !db.redeemCodes[inputCode])
      return ctx.reply("❌ Kode redeem tidak valid atau sudah kedaluwarsa!");

    const codeData = db.redeemCodes[inputCode];
    if (codeData.claimedBy.includes(userId))
      return ctx.reply("❌ Kamu sudah pernah klaim kode ini!");

    if (codeData.claimedBy.length >= codeData.limit) {
      delete db.redeemCodes[inputCode];
      await saveDB();
      return ctx.reply(
        "❌ Maaf, kode ini sudah habis diklaim oleh orang lain!",
      );
    }

    if (!db.users[userId])
      db.users[userId] = {
        coin: 0,
        joined: false,
        refCount: 0,
        lastClaim: 0,
        isBanned: false,
        claimedMissions: {},
      };
    db.users[userId].coin = (db.users[userId].coin || 0) + codeData.reward;
    codeData.claimedBy.push(userId);

    if (codeData.claimedBy.length >= codeData.limit) {
      delete db.redeemCodes[inputCode];
    }
    await saveDB();
    ctx.reply(
      `🎉 Selamat! Kamu berhasil mendapatkan <b>${codeData.reward.toLocaleString()}</b> koin!`,
      { parse_mode: "HTML" },
    );
  });
};
