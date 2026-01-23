module.exports = {
    name: 'me',
    description: 'Get your user information.',
    code: async (ctx, { isOwner, isPremium, getCoins, getGachaTickets, escapeMarkdown, db }) => {
        const user = ctx.from;
        if (!user) {
            return ctx.reply('Could not get user information.');
        }

        const userId = user.id;
        const botUsername = ctx.botInfo.username;
        const name = escapeMarkdown(user.first_name + (user.last_name ? ` ${user.last_name}` : ''));
        const username = user.username ? escapeMarkdown(`@${user.username}`) : 'N/A';
        const coins = getCoins(userId);
        const tickets = getGachaTickets(userId);

        let status = 'User';
        if (isOwner(userId)) {
            status = 'Owner';
        } else if (isPremium(userId)) {
            status = 'Premium';
        }

        // Referral Info
        const referredBy = db.get(`referred_by.${userId}`);
        const referrals = db.get(`referrals.${userId}`) || [];
        let referredByText = 'N/A';
        if (referredBy) {
            try {
                const referrer = await ctx.telegram.getChat(referredBy);
                referredByText = escapeMarkdown(referrer.first_name);
            } catch (e) {
                referredByText = `ID: \`${referredBy}\``;
            }
        }

        const referralLink = `https://t.me/${botUsername}?start=ref_${userId}`;

        const message = `
👤 *User Info*

*Name:* ${name}
*Username:* ${username}
*Telegram ID:* \`${userId}\`
*Status:* ${status}
*Coins:* ${coins}
*Gacha Tickets:* ${tickets}

📈 *Referral Info*
*Referred By:* ${referredByText}
*Total Invites:* ${Array.isArray(referrals) ? referrals.length : 0}
*Your Referral Link:* \`${referralLink}\`
        `;

        ctx.replyWithMarkdown(message);
    }
};
