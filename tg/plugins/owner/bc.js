export default (bot) => {
  bot.hears(/^\/bc (.+)/, async (ctx) => {
    const { db, config: tgbotConfig } = ctx.tgbot;
    const userId = ctx.from.id;
    if (userId !== tgbotConfig.ownerId) return;

    const textToBroadcast = ctx.match[1];
    const userIds = Array.from(db.users.keys());
    await ctx.reply(
      `🚀 <b>Memulai Broadcast...</b>\nTarget: ${userIds.length} User.`,
      { parse_mode: "HTML" },
    );

    let sukses = 0;
    let gagal = 0;

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const processBatch = async (batch) => {
      const promises = batch.map((id) =>
        bot.telegram
          .sendMessage(id, textToBroadcast, { parse_mode: "HTML" })
          .then(() => {
            sukses++;
          })
          .catch((e) => {
            gagal++;
          }),
      );
      await Promise.allSettled(promises);
    };

    const BATCH_SIZE = 5;
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      await processBatch(batch);
      if (i + BATCH_SIZE < userIds.length) {
        await delay(200);
      }
    }

    ctx.reply(
      `✅ <b>Broadcast Selesai!</b>\n\n🟢 Sukses: ${sukses}\n🔴 Gagal: ${gagal}`,
      { parse_mode: "HTML" },
    );
  });
};
