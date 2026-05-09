export default (bot) => {
    bot.on('message', async (ctx, next) => {
        try {
            const { db, saveDB, ownerState, config: tgbotConfig } = ctx.tgbot;
            const userId = ctx.from.id;
            const text = ctx.message?.text;

            const state = ownerState[userId] || null;
            if (!state) return next();

            // Tahap Bukti Share (Foto)
            if (state.step === 'waiting_bukti_share') {
                if (!ctx.message.photo) return ctx.reply("❌ Kirim dalam bentuk <b>FOTO</b> (Screenshot)!", { parse_mode: 'HTML' });

                state.fotoBukti = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                state.step = 'waiting_id_gratis';
                return ctx.reply("✅ Bukti diterima! Sekarang masukkan ID Akun kamu:");
            }

            if (state.step === 'waiting_id_gratis' && text) {
                const userTargetId = text.trim();
                await bot.telegram.sendPhoto(tgbotConfig.ownerId, state.fotoBukti, {
                    caption: `<b>🚨 LAPORAN MISI</b>\n\n👤 Pengirim: <code>${userId}</code>\n🆔 ID Target: <code>${userTargetId}</code>`,
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: [[{ text: "✅ ACC", callback_data: `acc_share_${userTargetId}` }, { text: "❌ TOLAK", callback_data: `tolak_share_${userTargetId}` }]] }
                }).catch((e) => { (global.consolefy?.error || console.error)('Error during execution:', e); });
                delete ownerState[userId];
                return ctx.reply("✅ <b>Bukti Berhasil Dikirim ke Owner!</b>", { parse_mode: 'HTML' });
            }

            // Owner: Broadcast Link
            if (state.step === 'create_misi_link' && userId === tgbotConfig.ownerId) {
                state.linkMisi = text;
                state.step = 'create_misi_reward';
                return ctx.reply("💰 <b>Berapa hadiah coin untuk misi ini?</b>", { parse_mode: 'HTML' });
            }

            if (state.step === 'create_misi_reward' && userId === tgbotConfig.ownerId) {
                const reward = parseInt(text);
                if (!Number.isFinite(reward) || reward <= 0) {
                    return ctx.reply("❌ Hadiah harus berupa angka positif! Coba masukkan kembali jumlah hadiah:", { parse_mode: 'HTML' });
                }

                const channelUsername = state.linkMisi.split('/').pop().replace('@', '');
                const misiId = `${channelUsername}_${reward}_${Date.now()}`;

                Array.from(db.users.keys()).forEach(id => {
                    bot.telegram.sendMessage(id, `📢 <b>MISI BARU</b>\n💰 <b>Hadiah:</b> ${reward.toLocaleString()} Coin`, {
                        parse_mode: 'HTML',
                        reply_markup: { inline_keyboard: [[{ text: "🔗 Gabung", url: state.linkMisi }], [{ text: "✅ Saya Sudah Join", callback_data: `check_join|${channelUsername}|${reward}|${misiId}` }]] }
                    }).catch((e) => { (global.consolefy?.error || console.error)('Error during execution:', e); });
                });
                delete ownerState[userId];
                return ctx.reply("✅ <b>Misi berhasil disebar!</b>", { parse_mode: 'HTML' });
            }

            // Owner: Kode Redeem
            if (state.step === 'rd_code' && text) {
                state.code = text.trim().toUpperCase();
                state.step = 'rd_reward';
                return ctx.reply(`✅ Kode <b>${state.code}</b> disimpan.\n💰 Masukkan jumlah koin:`, { parse_mode: 'HTML' });
            }

            if (state.step === 'rd_reward' && text) {
                const reward = parseInt(text.replace(/\./g, ''));
                if (!Number.isFinite(reward) || reward <= 0) {
                    return ctx.reply("❌ Hadiah harus berupa angka positif! Coba masukkan kembali jumlah koin:", { parse_mode: 'HTML' });
                }

                if (!db.redeemCodes) db.redeemCodes = {};
                db.getRedeemCode(state.code) = { reward: reward, limit: 5, claimedBy: [] };
                await saveDB();

                if (tgbotConfig.newsletter) {
                    bot.telegram.sendMessage(tgbotConfig.newsletter, `<b>🎁 KODE REDEEM BARU!</b>\n🔑 <b>Kode :</b> <code>${state.code}</code>\n💰 <b>Hadiah :</b> ${reward} Koin`, { parse_mode: 'HTML' })
                        .then(() => ctx.reply(`✅ Berhasil! Kode <b>${state.code}</b> aktif.`, { parse_mode: 'HTML' }))
                        .catch((e) => { ctx.reply(`✅ Kode aktif di DB, tapi <b>GAGAL</b> kirim ke channel!`); (global.consolefy?.error || console.error)(e); });
                } else {
                    ctx.reply(`✅ Berhasil! Kode <b>${state.code}</b> aktif.`, { parse_mode: 'HTML' });
                }
                delete ownerState[userId];
                return;
            }

            // Owner: Tambah coin manual
            if (state.step === 'waiting_user_id' && text) {
                const targetId = text.trim();
                state.targetId = targetId;
                state.step = 'add_coin_amount';
                return ctx.reply(`👤 Target: <code>${targetId}</code>\n💰 Masukkan jumlah koin yang akan ditambahkan:`, { parse_mode: 'HTML' });
            }

            if (state.step === 'add_coin_amount' && text) {
                const targetId = state.targetId;
                const coinToAdd = parseInt(text.replace(/\./g, ''));
                if (!Number.isFinite(coinToAdd) || coinToAdd <= 0) {
                    return ctx.reply("❌ Jumlah harus berupa angka positif! Coba masukkan kembali jumlah koin:", { parse_mode: 'HTML' });
                }

                if (!db.hasUser(targetId)) {
                    db.updateUser(targetId, { coin: 0, joined: false, refCount: 0, lastClaim: 0, isBanned: false, claimedMissions: {} });
                }

                db.updateUser(targetId, { coin: (db.getUser(targetId)?.coin || 0) + coinToAdd });
                await saveDB();
                ctx.reply(`✅ Berhasil menambah ${coinToAdd} koin ke user <code>${targetId}</code>!`, { parse_mode: 'HTML' });
                delete ownerState[userId];
                return;
            }

            // Owner: Upload File Script
            if (state.step === 'waiting_file') {
                if (ctx.message.document) {
                    state.tempFiles.push({ name: ctx.message.document.file_name, fileId: ctx.message.document.file_id });
                    return;
                } else if (text && text.toUpperCase() === 'DONE') {
                    if (state.tempFiles.length === 0) return ctx.reply("❌ Kirim filenya dulu!");
                    state.step = 'waiting_price_bulk';
                    return ctx.reply(`📦 Total <b>${state.tempFiles.length} Script</b> diterima.\n💰 Masukkan Harga:`, { parse_mode: 'HTML' });
                }
            }

            if (state.step === 'waiting_price_bulk' && text) {
                const price = parseInt(text.replace(/\./g, ''));
                if (!Number.isFinite(price) || price < 0) {
                    return ctx.reply("❌ Harga harus berupa angka positif (atau 0)! Coba masukkan kembali harga:", { parse_mode: 'HTML' });
                }

                state.tempFiles.forEach(f => db.addScript({ name: f.name, fileId: f.fileId, price: price }));
                await saveDB();
                ctx.reply(`✅ Berhasil menambah ${state.tempFiles.length} script!`);
                delete ownerState[userId];
                return;
            }

            next();
        } catch (e) {
            (global.consolefy?.error || console.error)("Error di handler message:", e);
            next();
        }
    });
};
