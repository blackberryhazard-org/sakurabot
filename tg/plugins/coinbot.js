import fs from "fs/promises";
import path from "path";
import config from "../../config.js";

const dbFile = path.join(process.cwd(), "database", "tg_coinbot.json");

// --- SISTEM DATABASE ASYNC (ANTI-DELAY & AUTO-FIX) ---
let db = { users: {}, scripts: [], redeemCodes: {} };
let writePromise = Promise.resolve();
let isWriting = false;
let isPending = false;

async function loadDB() {
  try {
    await fs.mkdir(path.dirname(dbFile), { recursive: true });
    try {
      await fs.access(dbFile);
      const data = await fs.readFile(dbFile, "utf8");
      if (data.trim().length > 0) {
        const parsed = JSON.parse(data);
        db.users = parsed.users || {};
        db.scripts = parsed.scripts || [];
        db.redeemCodes = parsed.redeemCodes || {};

        Object.keys(db.users).forEach((id) => {
          if (db.users[id].coin === null || db.users[id].coin === undefined)
            db.users[id].coin = 0;
          if (!db.users[id].lastClaim) db.users[id].lastClaim = 0;
          if (db.users[id].isBanned === undefined)
            db.users[id].isBanned = false;
          if (db.users[id].isVip === undefined) db.users[id].isVip = false;
          if (db.users[id].misiSelesai === undefined)
            db.users[id].misiSelesai = false;
          if (!db.users[id].claimedMissions) db.users[id].claimedMissions = {};
        });
      }
    } catch {
      await saveDB();
    }
    console.log("✅ Database Coinbot Berhasil Dimuat");
  } catch (err) {
    console.error("❌ Gagal load database coinbot:", err);
    db = { users: {}, scripts: [], redeemCodes: {} };
  }
}

function saveDB() {
  if (isWriting) {
    isPending = true;
    return writePromise;
  }

  isWriting = true;
  writePromise = (async () => {
    try {
      const tempFile = `${dbFile}.temp`;
      await fs.writeFile(tempFile, JSON.stringify(db, null, 2));
      await fs.rename(tempFile, dbFile);
    } catch (err) {
      console.error("❌ Gagal simpan database coinbot:", err);
    } finally {
      isWriting = false;
      if (isPending) {
        isPending = false;
        await saveDB();
      }
    }
  })();
  return writePromise;
}

let ownerState = {};

// Dummy configs fallback
const coinbotConfig = {
  channels: config.tgbot?.channels || [],
  group: config.tgbot?.group || "",
  notifChannel: config.tgbot?.notifChannel || "",
  startImage: config.tgbot?.startImage || "https://files.catbox.moe/w6izfk.jpg",
  ownerId: config.tgbot?.ownerId ? Number(config.tgbot.ownerId) : null,
};

// --- HELPER FUNCTIONS ---
async function checkJoin(bot, userId) {
  try {
    const chats = [...coinbotConfig.channels, coinbotConfig.group].filter(
      Boolean,
    );
    if (chats.length === 0) return true; // Default to true if no channels configured
    for (let chat of chats) {
      const member = await bot.telegram.getChatMember(chat, userId);
      if (["left", "kicked", "restricted"].includes(member.status))
        return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

const mainMenu = (userId) => {
  // Auto-create user structure if somehow missing when calling menu
  if (!db.users[userId]) {
    db.users[userId] = {
      coin: 0,
      joined: false,
      refCount: 0,
      lastClaim: 0,
      isBanned: false,
      claimedMissions: {},
    };
    saveDB();
  }

  const user = db.users[userId];
  const saldo = (user.coin || 0).toLocaleString();

  const caption =
    `<b>─〔 🤖 BOT COIN SCRIPT 〕─</b>\n\n` +
    `👋 Selamat Datang, <b>${userId}</b>!\n` +
    `┣ 💰 <b>Saldo :</b> ${saldo} Coins\n` +
    `┣ 👥 <b>Referral :</b> ${user.refCount || 0} Orang\n` +
    `┗ 🆔 <b>Status :</b> ${userId === coinbotConfig.ownerId ? "Owner" : "Member"}\n\n` +
    `<blockquote>Kumpulkan koin dengan mengajak teman bergabung dan tukarkan dengan script premium!</blockquote>\n` +
    `<b>──────────────────────</b>`;

  let buttons = [
    [
      { text: "🛒 Tukar Coin", callback_data: "tukar_coin" },
      { text: "📜 List Script", callback_data: "list_script" },
    ],
    [
      { text: "🎁 Klaim Harian", callback_data: "daily_claim" },
      { text: "🎰 Lucky Spin", callback_data: "lucky_spin" },
    ],
    [
      { text: "📦 Mystery Box", callback_data: "gacha_script" },
      { text: "🎮 Tebak Angka", callback_data: "tebak_angka" },
    ],
    [
      { text: "📝 Misi Coin", callback_data: "list_misi" },
      { text: "💰 Beli Coin", callback_data: "beli_coin" },
    ],
    [
      { text: "💳 Ambil Coin", callback_data: "referral" },
      { text: "🏆 Top Sultan", callback_data: "leaderboard" },
    ],
    [
      { text: "📊 Statistik", callback_data: "bot_stats" },
      { text: "💸 Transfer Coin", callback_data: "transfer_coin" },
    ],
    [{ text: "🆓 Coin Gratis", callback_data: "coin_gratis" }],
    [{ text: "💬 Code Redeem", url: "https://t.me/bot_coin_info" }],
  ];

  if (userId === coinbotConfig.ownerId) {
    buttons.push([{ text: "⚙️ OWNER DASHBOARD", callback_data: "owner_menu" }]);
  }

  return {
    caption: caption,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons },
  };
};

export default async (bot) => {
  await loadDB(); // Ensure DB is loaded before setting handlers

  bot.hears(/^\/bc (.+)/, async (ctx) => {
    const userId = ctx.from.id;
    if (userId !== coinbotConfig.ownerId) return;

    const textToBroadcast = ctx.match[1];
    const userIds = Object.keys(db.users);
    await ctx.reply(
      `🚀 <b>Memulai Broadcast...</b>\nTarget: ${userIds.length} User.`,
      { parse_mode: "HTML" },
    );

    let sukses = 0;
    let gagal = 0;

    // Broadcast batched with delay
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const processBatch = async (batch) => {
      const promises = batch.map((id) =>
        bot.telegram
          .sendMessage(id, textToBroadcast, { parse_mode: "HTML" })
          .then(() => {
            sukses++;
          })
          .catch(() => {
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

  bot.hears(/^\/ban (.+)/, async (ctx) => {
    if (ctx.from.id !== coinbotConfig.ownerId) return;
    const targetId = ctx.match[1].trim();
    if (!db.users[targetId]) return ctx.reply("❌ ID tidak ditemukan.");

    db.users[targetId].isBanned = true;
    await saveDB();
    ctx.reply(`✅ User <code>${targetId}</code> berhasil di-BANNED.`, {
      parse_mode: "HTML",
    });
    bot.telegram
      .sendMessage(
        targetId,
        "🚫 <b>AKUN KAMU DI BANNED!</b>\nKamu tidak bisa lagi menggunakan layanan bot ini.",
        { parse_mode: "HTML" },
      )
      .catch(() => {});
  });

  bot.hears(/^\/unban (.+)/, async (ctx) => {
    if (ctx.from.id !== coinbotConfig.ownerId) return;
    const targetId = ctx.match[1].trim();
    if (!db.users[targetId]) return ctx.reply("❌ ID tidak ditemukan.");

    db.users[targetId].isBanned = false;
    await saveDB();
    ctx.reply(`✅ User <code>${targetId}</code> telah di-UNBAN.`, {
      parse_mode: "HTML",
    });
    bot.telegram
      .sendMessage(
        targetId,
        "✅ <b>AKUN KEMBALI AKTIF!</b>\nSekarang kamu bisa menggunakan bot lagi.",
        { parse_mode: "HTML" },
      )
      .catch(() => {});
  });

  bot.hears(/^\/redeem (.+)/, async (ctx) => {
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

  bot.command("start", async (ctx) => {
    try {
      const userId = ctx.from.id;
      const payload = ctx.payload;

      // 1. Cek Blokir
      if (db.users[userId] && db.users[userId].isBanned) {
        return ctx.reply(
          "🚫 <b>AKUN KAMU DI BANNED!</b>\nKamu tidak bisa lagi menggunakan layanan bot ini.",
          { parse_mode: "HTML" },
        );
      }

      // 2. Handle Referral
      if (payload && payload !== String(userId)) {
        const referrerId = parseInt(payload);
        if (Number.isFinite(referrerId) && !db.users[userId]) {
          db.users[userId] = {
            coin: 0,
            joined: false,
            refBy: referrerId,
            refCount: 0,
            lastClaim: 0,
            isBanned: false,
            claimedMissions: {},
          };
          if (db.users[referrerId]) {
            db.users[referrerId].coin =
              (db.users[referrerId].coin || 0) + 30000;
            db.users[referrerId].refCount =
              (db.users[referrerId].refCount || 0) + 1;
            bot.telegram
              .sendMessage(
                referrerId,
                `<b>🔔 NOTIFIKASI REFERRAL</b>\n\n<blockquote>Teman bergabung!\n💰 <b>+30.000 Coins</b> ditambahkan.</blockquote>`,
                { parse_mode: "HTML" },
              )
              .catch(() => {});
          }
          await saveDB();
        }
      }

      // 3. Auto Register Background
      if (!db.users[userId]) {
        db.users[userId] = {
          coin: 0,
          joined: false,
          refCount: 0,
          lastClaim: 0,
          isBanned: false,
          claimedMissions: {},
        };
        await saveDB();
      }

      // 4. Force Subscribe Check
      const isJoined = await checkJoin(bot, userId);

      // Bonus Koin jika baru pertama kali join
      if (isJoined && !db.users[userId].joined) {
        db.users[userId].coin = (db.users[userId].coin || 0) + 2000;
        db.users[userId].joined = true;
        await saveDB();
        ctx.reply(
          "<b>🎉 WELCOME BONUS!</b>\n<blockquote>Bonus 2.000 koin cair karena sudah bergabung di komunitas kami!</blockquote>",
          { parse_mode: "HTML" },
        );
      }

      if (!isJoined && coinbotConfig.channels?.length > 0) {
        return ctx.reply(
          `<b>〔 ⚠️ AKSES TERBATAS 〕</b>\n\nMaaf, kamu harus bergabung ke komunitas kami terlebih dahulu.\n\n<blockquote>Pastikan sudah join semua channel di bawah, lalu ketik /start untuk verifikasi.</blockquote>`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Info Channel", url: "https://t.me/kai_ampas" }],
                [
                  {
                    text: "✅ Bukti Penukaran",
                    url: "https://t.me/notif_bot_coin",
                  },
                ],
              ],
            },
          },
        );
      }

      // 5. Langsung tampilkan menu utama
      const menu = mainMenu(userId);
      ctx.replyWithPhoto(coinbotConfig.startImage, menu).catch(() => {
        ctx.reply(menu.caption, {
          parse_mode: "HTML",
          reply_markup: menu.reply_markup,
        });
      });
    } catch (e) {
      global.consolefy?.error(e) || console.error(e);
    }
  });

  bot.on("callback_query", async (ctx) => {
    try {
      const userId = ctx.from.id;
      const data = ctx.callbackQuery.data;

      ctx.answerCbQuery().catch(() => {});

      if (db.maintenance && userId !== coinbotConfig.ownerId) {
        return ctx.answerCbQuery(
          "🚧 Bot sedang Maintenance!\nSemua fitur tombol dimatikan sementara.",
          { show_alert: true },
        );
      }

      if (data.startsWith("acc_share_")) {
        const targetId = data.split("_")[2];
        if (!db.users[targetId])
          return ctx.answerCbQuery("User tidak ditemukan!", {
            show_alert: true,
          });

        db.users[targetId].coin = (db.users[targetId].coin || 0) + 5000;
        await saveDB();

        bot.telegram.sendMessage(
          targetId,
          "✅ MISI DISETUJUI!\nAdmin telah memverifikasi bukti share kamu.\n+5.000 Coin telah ditambahkan.",
        );
        return ctx.editMessageCaption(
          `✅ <b>MISI BERHASIL (ACC)</b>\nTarget ID: <code>${targetId}</code>\nKoin sudah ditambahkan otomatis.`,
          { parse_mode: "HTML" },
        );
      }

      if (data.startsWith("tolak_share_")) {
        const targetId = data.split("_")[2];
        bot.telegram.sendMessage(
          targetId,
          "❌ <b>MISI DITOLAK</b>\nMohon maaf, bukti share kamu tidak valid.",
        );
        return ctx.editMessageCaption(
          `❌ <b>MISI DITOLAK</b>\nUser ID: <code>${targetId}</code> sudah diberitahu.`,
          { parse_mode: "HTML" },
        );
      }

      if (data === "check_join") {
        if (await checkJoin(bot, userId)) {
          ctx.deleteMessage().catch(() => {});
          ctx.replyWithPhoto(coinbotConfig.startImage, mainMenu(userId));
        } else {
          ctx.answerCbQuery("❌ Belum join semua!", { show_alert: true });
        }
      }

      if (data === "coin_gratis") {
        const teksPromosi = `🚀 *MAU SCRIPT VIP GRATIS?*\n\nBuruan gabung ke bot ini, kumpulkan koinnya dan tukar dengan script favorit kamu!\n\n🔗 *Link Bot:* @Coin_Script_Bot\n🎁 *Bonus:* 5.000 Coin buat kamu yang share!`;
        const fotoPromosi = `https://files.catbox.moe/w6izfk.jpg`;

        await ctx.replyWithPhoto(fotoPromosi, {
          caption: `<b>💰 MISI SHARE & DAPAT KOIN</b>\n\nShare foto di atas dengan teks di bawah ini:\n\n<code>${teksPromosi}</code>\n\n<b>Setelah share, silakan screenshot dan kirim fotonya ke sini!</b>`,
          parse_mode: "HTML",
        });

        ownerState[userId] = { step: "waiting_bukti_share" };
        return ctx.reply(
          "📸 <b>Silahkan kirim FOTO bukti screenshot kamu sekarang:</b>",
          { parse_mode: "HTML" },
        );
      }

      if (data === "create_misi_ads") {
        ownerState[userId] = { step: "create_misi_link" };
        return ctx.reply(
          "🔗 <b>MASUKKAN LINK MISI</b>\n\nContoh: <code>https://t.me/NamaChannelKamu</code>",
          { parse_mode: "HTML" },
        );
      }

      if (data.startsWith("check_join|")) {
        const parts = data.split("|");
        const channel = parts[1];
        const rewardAmount = parseInt(parts[2]);
        const misiId = parts[3];

        if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) {
          return ctx.answerCbQuery("❌ Data misi tidak valid!", {
            show_alert: true,
          });
        }

        if (!db.users[userId]) {
          db.users[userId] = {
            coin: 0,
            joined: false,
            refCount: 0,
            lastClaim: 0,
            isBanned: false,
            claimedMissions: {},
          };
        }
        if (!db.users[userId].claimedMissions)
          db.users[userId].claimedMissions = {};

        if (db.users[userId].claimedMissions[misiId]) {
          return ctx.answerCbQuery("❌ Kamu sudah mengklaim hadiah misi ini!", {
            show_alert: true,
          });
        }

        try {
          const chatMember = await bot.telegram.getChatMember(
            `@${channel}`,
            userId,
          );
          const status = chatMember.status;

          if (["member", "administrator", "creator"].includes(status)) {
            db.users[userId].coin = (db.users[userId].coin || 0) + rewardAmount;
            db.users[userId].claimedMissions[misiId] = true;
            await saveDB();
            await ctx.answerCbQuery(
              `🎉 Berhasil! +${rewardAmount} Koin masuk.`,
              { show_alert: true },
            );
            return ctx.editMessageText(
              `✅ <b>MISI SELESAI</b>\n\nKamu sudah bergabung dan mendapatkan <b>${rewardAmount.toLocaleString()}</b> koin.`,
              { parse_mode: "HTML" },
            );
          } else {
            return ctx.answerCbQuery("❌ Kamu belum join!", {
              show_alert: true,
            });
          }
        } catch (err) {
          return ctx.answerCbQuery(
            "⚠️ Gagal cek status! Pastikan Bot sudah menjadi ADMIN.",
            { show_alert: true },
          );
        }
      }

      if (data === "list_misi") {
        const txtMisi = `<b>📝 MISI KOIN GRATIS</b>\n\nSelesaikan misi di bawah ini:\n...`;
        ctx.editMessageCaption(txtMisi, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📢 Join", url: "https://t.me/Rayernon" }],
              [{ text: "✅ Ambil Hadiah", callback_data: "claim_misi" }],
              [{ text: "⬅️ Kembali", callback_data: "back_home" }],
            ],
          },
        });
      }

      if (data === "claim_misi") {
        const isJoined = await checkJoin(bot, userId);
        if (isJoined) {
          if (db.users[userId].misiSelesai)
            return ctx.answerCbQuery(
              "❌ Kamu sudah mengambil hadiah misi ini!",
              { show_alert: true },
            );
          db.users[userId].coin += 5000;
          db.users[userId].misiSelesai = true;
          await saveDB();
          ctx.reply("<b>🎉 MISI SELESAI!</b>\n+5.000 koin.", {
            parse_mode: "HTML",
          });
          ctx.editMessageCaption(mainMenu(userId).caption, mainMenu(userId));
        } else {
          ctx.answerCbQuery("❌ Kamu belum join semua channel!", {
            show_alert: true,
          });
        }
      }

      if (data === "tebak_angka") {
        const txtGame = `<b>🎮 GAME TEBAK ANGKA</b>\nPilih satu angka dari 1 - 5.`;
        ctx.editMessageCaption(txtGame, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "1", callback_data: "bet_1" },
                { text: "2", callback_data: "bet_2" },
                { text: "3", callback_data: "bet_3" },
              ],
              [
                { text: "4", callback_data: "bet_4" },
                { text: "5", callback_data: "bet_5" },
              ],
              [{ text: "⬅️ Kembali", callback_data: "back_home" }],
            ],
          },
        });
      }

      if (data.startsWith("bet_")) {
        const userGuess = parseInt(data.split("_")[1]);
        if (db.users[userId].coin < 1000)
          return ctx.answerCbQuery("❌ Koin kamu kurang!", {
            show_alert: true,
          });

        db.users[userId].coin -= 1000;
        const botNumber = Math.floor(Math.random() * 5) + 1;
        let resultTxt = "";
        if (userGuess === botNumber) {
          db.users[userId].coin += 5000;
          resultTxt = `🎉 <b>MENANG JACKPOT!</b>\nAngka: <b>${botNumber}</b>\nSelamat! +5.000 Koin!`;
        } else {
          resultTxt = `💀 <b>ZONK</b>\nAngka Bot: <b>${botNumber}</b>\nKoin 1.000 hangus.`;
        }
        await saveDB();
        ctx.editMessageCaption(resultTxt, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎮 Main Lagi", callback_data: "tebak_angka" }],
              [{ text: "⬅️ Menu Utama", callback_data: "back_home" }],
            ],
          },
        });
      }

      if (data === "gacha_script") {
        if (db.users[userId].coin < 10000)
          return ctx.answerCbQuery("❌ Koin kamu kurang 10.000!", {
            show_alert: true,
          });
        if (db.scripts.length === 0)
          return ctx.answerCbQuery("❌ Belum ada script.", {
            show_alert: true,
          });

        db.users[userId].coin -= 10000;
        const scriptAcak =
          db.scripts[Math.floor(Math.random() * db.scripts.length)];
        await saveDB();

        ctx.editMessageCaption("🌀 <b>SEDANG MENGACAK BOX...</b>", {
          parse_mode: "HTML",
        });

        setTimeout(() => {
          ctx.replyWithDocument(scriptAcak.fileId, {
            caption: `<b>📦 MYSTERY BOX DIBUKA!</b>\n📂 Script: <b>${scriptAcak.name}</b>`,
            parse_mode: "HTML",
          });
          if (coinbotConfig.notifChannel) {
            bot.telegram
              .sendMessage(
                coinbotConfig.notifChannel,
                `📦 <b>GACHA BOX</b>\nUser: <code>${userId}</code>\nHadiah: ${scriptAcak.name}`,
                { parse_mode: "HTML" },
              )
              .catch(() => {});
          }
          ctx.reply(mainMenu(userId).caption, mainMenu(userId));
        }, 3000);
      }

      if (
        data === "list_script" ||
        data === "tukar_coin" ||
        data.startsWith("page_")
      ) {
        if (db.scripts.length === 0)
          return ctx.answerCbQuery("Kosong!", { show_alert: true });

        const page = data.startsWith("page_")
          ? parseInt(data.split("_")[1])
          : 0;
        const perPage = 5;
        const start = page * perPage;
        const end = start + perPage;
        const items = db.scripts.slice(start, end);

        let buttons = items.map((s, index) => [
          {
            text: `📂 ${s.name} [ ${s.price.toLocaleString()} ]`,
            callback_data: `buy_${start + index}`,
          },
        ]);

        let navRow = [];
        navRow.push(
          page > 0
            ? { text: "⬅️ Back", callback_data: `page_${page - 1}` }
            : { text: "⬛", callback_data: "none" },
        );
        navRow.push({ text: "🏠 HOME", callback_data: "back_home" });
        navRow.push(
          end < db.scripts.length
            ? { text: "Next ➡️", callback_data: `page_${page + 1}` }
            : { text: "⬛", callback_data: "none" },
        );
        buttons.push(navRow);

        ctx
          .editMessageCaption(
            `<b>📂 LIST SCRIPT (Hal: ${page + 1})</b>\nPilih script yang ingin ditukar:`,
            {
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: buttons },
            },
          )
          .catch(() => {});
      }

      if (data.startsWith("buy_")) {
        const index = data.split("_")[1];
        const script = db.scripts[index];
        if (db.users[userId].coin < script.price)
          return ctx.answerCbQuery("❌ Koin tidak cukup!", {
            show_alert: true,
          });

        db.users[userId].coin -= script.price;
        await saveDB();

        await ctx
          .replyWithDocument(script.fileId, {
            caption: `<b>✅ PENUKARAN BERHASIL</b>\n\n┣ 📂 <b>Nama:</b> ${script.name}\n┗ 💸 <b>Harga:</b> ${script.price.toLocaleString()} Coins`,
            parse_mode: "HTML",
          })
          .catch(() => {});

        if (coinbotConfig.notifChannel) {
          bot.telegram
            .sendMessage(
              coinbotConfig.notifChannel,
              `<b>🚀 LOG PENUKARAN</b>\n👤 User: <code>${userId}</code>\n📂 Script: ${script.name}`,
              { parse_mode: "HTML" },
            )
            .catch(() => {});
        }
        ctx.answerCbQuery("✅ Berhasil!", { show_alert: true });
      }

      if (data === "daily_claim") {
        const now = Date.now();
        const last = db.users[userId].lastClaim || 0;
        if (now - last < 86400000)
          return ctx.answerCbQuery(`⏳ Tunggu beberapa jam lagi!`, {
            show_alert: true,
          });
        db.users[userId].coin += 5000;
        db.users[userId].lastClaim = now;
        await saveDB();
        ctx.answerCbQuery("🎉 +5.000 Koin Harian!", { show_alert: true });
        ctx.editMessageCaption(mainMenu(userId).caption, mainMenu(userId));
      }

      if (data === "lucky_spin") {
        if (db.users[userId].coin < 2000)
          return ctx.answerCbQuery("❌ Butuh 2000 koin!", { show_alert: true });
        db.users[userId].coin -= 2000;
        const r = Math.random();
        let win = 0;
        let txt = "💀 Zonk!";
        if (r > 0.9) {
          win = 5000;
          txt = "🔥 JACKPOT 5.000!";
        } else if (r > 0.6) {
          win = 3000;
          txt = "🎉 MENANG 3.000!";
        } else if (r > 0.3) {
          win = 2000;
          txt = "⚖️ Balik Modal!";
        }
        db.users[userId].coin += win;
        await saveDB();
        ctx.answerCbQuery(txt, { show_alert: true });
        ctx.editMessageCaption(mainMenu(userId).caption, mainMenu(userId));
      }

      if (data === "back_home") {
        ctx.editMessageCaption(mainMenu(userId).caption, mainMenu(userId));
      }

      // --- DASHBOARD OWNER ---
      if (data === "owner_menu" && userId === coinbotConfig.ownerId) {
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
                  {
                    text: "📢 Buat Misi Join",
                    callback_data: "create_misi_ads",
                  },
                  { text: "📥 Backup", callback_data: "backup_db" },
                ],
                [{ text: "🔥 RESET DATABASE", callback_data: "ask_reset" }],
                [{ text: "⬅️ Kembali", callback_data: "back_home" }],
              ],
            },
          },
        );
      }

      if (data === "ask_reset" && userId === coinbotConfig.ownerId) {
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
      }

      if (data === "confirm_reset_all" && userId === coinbotConfig.ownerId) {
        db = { users: {}, scripts: [], redeemCodes: {} };
        await saveDB();
        ctx.answerCbQuery("💥 Database telah dikosongkan!", {
          show_alert: true,
        });
        ctx.reply("✅ <b>RESET SUKSES!</b>\nKetik /start untuk daftar ulang.", {
          parse_mode: "HTML",
        });
      }

      if (data === "backup_db" && userId === coinbotConfig.ownerId) {
        await saveDB();
        ctx.replyWithDocument(
          { source: dbFile },
          { caption: "📂 <b>BACKUP DATABASE</b>", parse_mode: "HTML" },
        );
      }

      if (data === "create_redeem" && userId === coinbotConfig.ownerId) {
        ownerState[userId] = { step: "rd_code" };
        ctx.reply("🎁 <b>BUAT REDEEM</b>\nMasukkan Kode (Contoh: KAI2024):", {
          parse_mode: "HTML",
        });
      }

      if (data === "add_coin_user" && userId === coinbotConfig.ownerId) {
        ownerState[userId] = { step: "waiting_user_id" };
        ctx.reply("👤 Masukkan ID Target:");
      }

      if (data === "add_script" && userId === coinbotConfig.ownerId) {
        ownerState[userId] = { step: "waiting_file", tempFiles: [] };
        ctx.reply(
          "📤 Silahkan kirim semua file script sekaligus.\nJika sudah, ketik: <b>DONE</b>",
          { parse_mode: "HTML" },
        );
      }

      if (data === "del_script" && userId === coinbotConfig.ownerId) {
        let buttons = db.scripts.map((s, index) => [
          {
            text: `🗑 Hapus: ${s.name}`,
            callback_data: `confirm_del_${index}`,
          },
        ]);
        buttons.push([{ text: "⬅️ Batal", callback_data: "owner_menu" }]);
        ctx.editMessageCaption(`🗑 Hapus yang mana?`, {
          reply_markup: { inline_keyboard: buttons },
        });
      }

      if (data.startsWith("confirm_del_") && userId === coinbotConfig.ownerId) {
        const index = data.split("_")[2];
        db.scripts.splice(index, 1);
        await saveDB();
        ctx.reply("✅ Terhapus.");
      }
    } catch (e) {
      global.consolefy?.error(e) || console.error(e);
    }
  });

  bot.on("message", async (ctx, next) => {
    try {
      const userId = ctx.from.id;
      const text = ctx.message.text;

      if (text === "/maint on" && userId === coinbotConfig.ownerId) {
        db.maintenance = true;
        await saveDB();
        return ctx.reply("🔴 <b>Maintenance DIAKTIFKAN!</b>", {
          parse_mode: "HTML",
        });
      }
      if (text === "/maint off" && userId === coinbotConfig.ownerId) {
        db.maintenance = false;
        await saveDB();
        return ctx.reply("🟢 <b>Maintenance DIMATIKAN!</b>", {
          parse_mode: "HTML",
        });
      }

      if (db.maintenance && userId !== coinbotConfig.ownerId) {
        return ctx.reply("🚧 <b>BOT SEDANG MAINTENANCE</b>", {
          parse_mode: "HTML",
        });
      }

      const state = ownerState[userId] || null;
      if (!state) return next();

      // Tahap Bukti Share (Foto)
      if (state.step === "waiting_bukti_share") {
        if (!ctx.message.photo)
          return ctx.reply("❌ Kirim dalam bentuk <b>FOTO</b> (Screenshot)!", {
            parse_mode: "HTML",
          });

        state.fotoBukti =
          ctx.message.photo[ctx.message.photo.length - 1].file_id;
        state.step = "waiting_id_gratis";
        return ctx.reply("✅ Bukti diterima! Sekarang masukkan ID Akun kamu:");
      }

      if (state.step === "waiting_id_gratis" && text) {
        const userTargetId = text.trim();
        await bot.telegram
          .sendPhoto(coinbotConfig.ownerId, state.fotoBukti, {
            caption: `<b>🚨 LAPORAN MISI</b>\n\n👤 Pengirim: <code>${userId}</code>\n🆔 ID Target: <code>${userTargetId}</code>`,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "✅ ACC",
                    callback_data: `acc_share_${userTargetId}`,
                  },
                  {
                    text: "❌ TOLAK",
                    callback_data: `tolak_share_${userTargetId}`,
                  },
                ],
              ],
            },
          })
          .catch(() => {});
        delete ownerState[userId];
        return ctx.reply("✅ <b>Bukti Berhasil Dikirim ke Owner!</b>", {
          parse_mode: "HTML",
        });
      }

      // Owner: Broadcast Link
      if (
        state.step === "create_misi_link" &&
        userId === coinbotConfig.ownerId
      ) {
        state.linkMisi = text;
        state.step = "create_misi_reward";
        return ctx.reply("💰 <b>Berapa hadiah coin untuk misi ini?</b>", {
          parse_mode: "HTML",
        });
      }

      if (
        state.step === "create_misi_reward" &&
        userId === coinbotConfig.ownerId
      ) {
        const reward = parseInt(text);
        if (!Number.isFinite(reward) || reward <= 0) {
          return ctx.reply(
            "❌ Hadiah harus berupa angka positif! Coba masukkan kembali jumlah hadiah:",
            { parse_mode: "HTML" },
          );
        }

        const channelUsername = state.linkMisi
          .split("/")
          .pop()
          .replace("@", "");
        const misiId = `${channelUsername}_${reward}_${Date.now()}`;

        Object.keys(db.users).forEach((id) => {
          bot.telegram
            .sendMessage(
              id,
              `📢 <b>MISI BARU</b>\n💰 <b>Hadiah:</b> ${reward.toLocaleString()} Coin`,
              {
                parse_mode: "HTML",
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🔗 Gabung", url: state.linkMisi }],
                    [
                      {
                        text: "✅ Saya Sudah Join",
                        callback_data: `check_join|${channelUsername}|${reward}|${misiId}`,
                      },
                    ],
                  ],
                },
              },
            )
            .catch(() => {});
        });
        delete ownerState[userId];
        return ctx.reply("✅ <b>Misi berhasil disebar!</b>", {
          parse_mode: "HTML",
        });
      }

      // Owner: Kode Redeem
      if (state.step === "rd_code" && text) {
        state.code = text.trim().toUpperCase();
        state.step = "rd_reward";
        return ctx.reply(
          `✅ Kode <b>${state.code}</b> disimpan.\n💰 Masukkan jumlah koin:`,
          { parse_mode: "HTML" },
        );
      }

      if (state.step === "rd_reward" && text) {
        const reward = parseInt(text.replace(/\./g, ""));
        if (!Number.isFinite(reward) || reward <= 0) {
          return ctx.reply(
            "❌ Hadiah harus berupa angka positif! Coba masukkan kembali jumlah koin:",
            { parse_mode: "HTML" },
          );
        }

        if (!db.redeemCodes) db.redeemCodes = {};
        db.redeemCodes[state.code] = {
          reward: reward,
          limit: 5,
          claimedBy: [],
        };
        await saveDB();

        if (coinbotConfig.notifChannel) {
          bot.telegram
            .sendMessage(
              coinbotConfig.notifChannel,
              `<b>🎁 KODE REDEEM BARU!</b>\n🔑 <b>Kode :</b> <code>${state.code}</code>\n💰 <b>Hadiah :</b> ${reward} Koin`,
              { parse_mode: "HTML" },
            )
            .then(() =>
              ctx.reply(`✅ Berhasil! Kode <b>${state.code}</b> aktif.`, {
                parse_mode: "HTML",
              }),
            )
            .catch(() =>
              ctx.reply(
                `✅ Kode aktif di DB, tapi <b>GAGAL</b> kirim ke channel!`,
              ),
            );
        } else {
          ctx.reply(`✅ Berhasil! Kode <b>${state.code}</b> aktif.`, {
            parse_mode: "HTML",
          });
        }
        delete ownerState[userId];
        return;
      }

      // Owner: Tambah coin manual
      if (state.step === "waiting_user_id" && text) {
        const targetId = text.trim();
        state.targetId = targetId;
        state.step = "add_coin_amount";
        return ctx.reply(
          `👤 Target: <code>${targetId}</code>\n💰 Masukkan jumlah koin yang akan ditambahkan:`,
          { parse_mode: "HTML" },
        );
      }

      if (state.step === "add_coin_amount" && text) {
        const targetId = state.targetId;
        const coinToAdd = parseInt(text.replace(/\./g, ""));
        if (!Number.isFinite(coinToAdd) || coinToAdd <= 0) {
          return ctx.reply(
            "❌ Jumlah harus berupa angka positif! Coba masukkan kembali jumlah koin:",
            { parse_mode: "HTML" },
          );
        }

        if (!db.users[targetId]) {
          db.users[targetId] = {
            coin: 0,
            joined: false,
            refCount: 0,
            lastClaim: 0,
            isBanned: false,
            claimedMissions: {},
          };
        }

        db.users[targetId].coin = (db.users[targetId].coin || 0) + coinToAdd;
        await saveDB();
        ctx.reply(
          `✅ Berhasil menambah ${coinToAdd} koin ke user <code>${targetId}</code>!`,
          { parse_mode: "HTML" },
        );
        delete ownerState[userId];
        return;
      }

      // Owner: Upload File Script
      if (state.step === "waiting_file") {
        if (ctx.message.document) {
          state.tempFiles.push({
            name: ctx.message.document.file_name,
            fileId: ctx.message.document.file_id,
          });
          return;
        } else if (text && text.toUpperCase() === "DONE") {
          if (state.tempFiles.length === 0)
            return ctx.reply("❌ Kirim filenya dulu!");
          state.step = "waiting_price_bulk";
          return ctx.reply(
            `📦 Total <b>${state.tempFiles.length} Script</b> diterima.\n💰 Masukkan Harga:`,
            { parse_mode: "HTML" },
          );
        }
      }

      if (state.step === "waiting_price_bulk" && text) {
        const price = parseInt(text.replace(/\./g, ""));
        if (!Number.isFinite(price) || price < 0) {
          return ctx.reply(
            "❌ Harga harus berupa angka positif (atau 0)! Coba masukkan kembali harga:",
            { parse_mode: "HTML" },
          );
        }

        state.tempFiles.forEach((f) =>
          db.scripts.push({ name: f.name, fileId: f.fileId, price: price }),
        );
        await saveDB();
        ctx.reply(`✅ Berhasil menambah ${state.tempFiles.length} script!`);
        delete ownerState[userId];
        return;
      }

      next();
    } catch (e) {
      global.consolefy?.error(e) ||
        console.error("Error di handler message:", e);
      next();
    }
  });
};
