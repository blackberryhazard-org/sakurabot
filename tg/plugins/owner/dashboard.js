export default (bot) => {
  bot.action("owner_menu", async (ctx) => {
    const { config: tgbotConfig } = ctx.tgbot;
    const userId = ctx.from.id;
    if (userId !== tgbotConfig.ownerId) return;

    ctx.editMessageCaption(
      `<b>──〔 🛠 OWNER DASHBOARD 〕───</b>\n\nSelamat datang Owner!`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "➕ Tambah Script", callback_data: "add_script" },
              { text: "🗑 Hapus Script", callback_data: "del_script" },
            ],
            [
              { text: "💰 Koin Per User", callback_data: "add_coin_user" },
              { text: "🎁 Buat Redeem", callback_data: "create_redeem" },
            ],
            [
              { text: "📢 Buat Misi Join", callback_data: "create_misi_ads" },
              { text: "📥 Backup", callback_data: "backup_db" },
            ],
            [{ text: "🔥 RESET DATABASE", callback_data: "ask_reset" }],
            [{ text: "⬅️ Kembali", callback_data: "back_home" }],
          ],
        },
      },
    );
  });

  bot.action("ask_reset", async (ctx) => {
    const { config: tgbotConfig } = ctx.tgbot;
    if (ctx.from.id !== tgbotConfig.ownerId) return;

    ctx.editMessageCaption(
      `<b>⚠️ PERINGATAN KERAS!</b>\nYakin hapus <b>SEMUA DATA</b>?`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ YA, HAPUS SEMUA",
                callback_data: "confirm_reset_all",
              },
            ],
            [{ text: "❌ BATALKAN", callback_data: "owner_menu" }],
          ],
        },
      },
    );
  });

  bot.action("confirm_reset_all", async (ctx) => {
    const { db, saveDB, config: tgbotConfig } = ctx.tgbot;
    if (ctx.from.id !== tgbotConfig.ownerId) return;

    await db.clearAll();
    await saveDB();
    ctx.answerCbQuery("💥 Database telah dikosongkan!", { show_alert: true });
    ctx.reply("✅ <b>RESET SUKSES!</b>\nKetik /start untuk daftar ulang.", {
      parse_mode: "HTML",
    });
  });

  bot.action("backup_db", async (ctx) => {
    const { saveDB, config: tgbotConfig } = ctx.tgbot;
    if (ctx.from.id !== tgbotConfig.ownerId) return;

    await saveDB();
    const dbFile = (await import("path")).join(
      process.cwd(),
      "data/tg/database.json",
    );
    ctx.replyWithDocument(
      { source: dbFile },
      { caption: "📂 <b>BACKUP DATABASE</b>", parse_mode: "HTML" },
    );
  });

  bot.action("create_redeem", async (ctx) => {
    const { ownerState, config: tgbotConfig } = ctx.tgbot;
    const userId = ctx.from.id;
    if (userId !== tgbotConfig.ownerId) return;

    ownerState[userId] = { step: "rd_code" };
    ctx.reply("🎁 <b>BUAT REDEEM</b>\nMasukkan Kode (Contoh: KAI2024):", {
      parse_mode: "HTML",
    });
  });

  bot.action("add_coin_user", async (ctx) => {
    const { ownerState, config: tgbotConfig } = ctx.tgbot;
    const userId = ctx.from.id;
    if (userId !== tgbotConfig.ownerId) return;

    ownerState[userId] = { step: "waiting_user_id" };
    ctx.reply("👤 Masukkan ID Target:");
  });

  bot.action("add_script", async (ctx) => {
    const { ownerState, config: tgbotConfig } = ctx.tgbot;
    const userId = ctx.from.id;
    if (userId !== tgbotConfig.ownerId) return;

    ownerState[userId] = { step: "waiting_file", tempFiles: [] };
    ctx.reply(
      "📤 Silahkan kirim semua file script sekaligus.\nJika sudah, ketik: <b>DONE</b>",
      { parse_mode: "HTML" },
    );
  });

  bot.action("del_script", async (ctx) => {
    const { db, config: tgbotConfig } = ctx.tgbot;
    const userId = ctx.from.id;
    if (userId !== tgbotConfig.ownerId) return;

    let buttons = db
      .getScripts()
      .map((s, index) => [
        { text: `🗑 Hapus: ${s.name}`, callback_data: `confirm_del_${index}` },
      ]);
    buttons.push([{ text: "⬅️ Batal", callback_data: "owner_menu" }]);
    ctx.editMessageCaption(`🗑 Hapus yang mana?`, {
      reply_markup: { inline_keyboard: buttons },
    });
  });

  bot.action(/^confirm_del_(\d+)$/, async (ctx) => {
    const { db, saveDB, config: tgbotConfig } = ctx.tgbot;
    if (ctx.from.id !== tgbotConfig.ownerId) return;

    const index = parseInt(ctx.match[1]);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= db.getScripts().length
    ) {
      return ctx.answerCbQuery("❌ Script tidak ditemukan!", {
        show_alert: true,
      });
    }

    db.removeScript(index);
    await saveDB();
    ctx.reply("✅ Terhapus.");
  });
};
