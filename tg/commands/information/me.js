module.exports = {
    name: "me",
    description: "Dapatkan informasi pengguna Anda.",
    code: async (ctx, { isOwner, isPremium, getCoins, getGachaTickets, getSakuranite, getMiningTickets, getMiningRate, escapeHTML, db, linking }) => {
        const user = ctx.from;
        if (!user) return ctx.reply("Tidak bisa mendapatkan informasi pengguna.");

        const userId = user.id;
        const botUsername = ctx.botInfo.username;
        const name = escapeHTML(user.first_name + (user.last_name ? ` ${user.last_name}` : ""));
        const username = user.username ? escapeHTML(`@${user.username}`) : "N/A";
        const coins = getCoins(userId);
        const sakuranite = getSakuranite(userId);
        const tickets = getGachaTickets(userId);
        const miningTickets = getMiningTickets(userId);
        const miningRate = getMiningRate(userId);

        let status = "Pengguna";
        if (isOwner(userId)) status = "Pemilik";
        else if (isPremium(userId)) status = "Premium";

        const referredBy = db.get(`referred_by.${userId}`);
        const referrals = db.get(`referrals.${userId}`) || [];
        let referredByText = "N/A";
        if (referredBy) {
            try {
                const referrer = await ctx.telegram.getChat(referredBy);
                referredByText = escapeHTML(referrer.first_name);
            } catch (e) { referredByText = `ID: <code>${referredBy}</code>`; }
        }

        const referralLink = `https://t.me/${botUsername}?start=ref_${userId}`;
        const waJid = linking.getWaJid(userId);
        const linkStatus = waJid ? `✅ Terhubung (${waJid.split("@")[0]})` : "❌ Tidak Terhubung";

        const message = `
👤 <b>Info Pengguna</b>

<b>Nama:</b> ${name}
<b>Username:</b> ${username}
<b>ID Telegram:</b> <code>${userId}</code>
<b>Status:</b> ${status}
<b>Koin:</b> ${coins}
<b>Sakuranite:</b> ${sakuranite}
<b>Tiket Gacha:</b> ${tickets}

⛏️ <b>Mining</b>
<b>Tiket Mining:</b> ${miningTickets}
<b>Rate Mining:</b> ${miningRate}

🔗 <b>Integrasi WhatsApp</b>
<b>Status:</b> ${linkStatus}

📈 <b>Info Rujukan</b>
<b>Dirujuk Oleh:</b> ${referredByText}
<b>Total Undangan:</b> ${Array.isArray(referrals) ? referrals.length : 0}
<b>Tautan Rujukan Anda:</b> <code>${referralLink}</code>
        `;
        ctx.reply(message, { parse_mode: "HTML" });
    }
};
