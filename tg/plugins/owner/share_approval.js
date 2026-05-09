export default (bot) => {
  bot.action(/^acc_share_(.+)$/, async (ctx) => {
    const { db, saveDB, config: tgbotConfig } = ctx.tgbot;
    if (ctx.from.id !== tgbotConfig.ownerId) return;

    const targetId = ctx.match[1];
    if (!db.hasUser(targetId))
      return ctx.answerCbQuery("User tidak ditemukan!", { show_alert: true });

    db.updateUser(targetId, { coin: (db.getUser(targetId)?.coin || 0) + 5000 });
    await saveDB();

    bot.telegram
      .sendMessage(
        targetId,
        "✅ MISI DISETUJUI!\nAdmin telah memverifikasi bukti share kamu.\n+5.000 Coin telah ditambahkan.",
      )
      .catch((e) => {
        (global.consolefy?.error || console.error)("Error execution:", e);
      });
    return ctx.editMessageCaption(
      `✅ <b>MISI BERHASIL (ACC)</b>\nTarget ID: <code>${targetId}</code>\nKoin sudah ditambahkan otomatis.`,
      { parse_mode: "HTML" },
    );
  });

  bot.action(/^tolak_share_(.+)$/, async (ctx) => {
    const { config: tgbotConfig } = ctx.tgbot;
    if (ctx.from.id !== tgbotConfig.ownerId) return;

    const targetId = ctx.match[1];
    bot.telegram
      .sendMessage(
        targetId,
        "❌ <b>MISI DITOLAK</b>\nMohon maaf, bukti share kamu tidak valid.",
        { parse_mode: "HTML" },
      )
      .catch((e) => {
        (global.consolefy?.error || console.error)("Error execution:", e);
      });
    return ctx.editMessageCaption(
      `❌ <b>MISI DITOLAK</b>\nUser ID: <code>${targetId}</code> sudah diberitahu.`,
      { parse_mode: "HTML" },
    );
  });
};
