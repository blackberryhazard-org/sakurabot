const moment = require('moment-timezone');

module.exports = {
    name: 'createredeemcode',
    category: 'owner',
    description: 'Create a redeem code.',
    code: async (ctx, { isLeader, isOwner, db }) => {
        const userId = ctx.from.id;
        if (!isOwner(userId)) return;

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 4) {
            return ctx.reply('Usage: /createredeemcode {type} {amount} {quota} {expiration_hours}');
        }

        const type = args[0].toLowerCase(); // e.g., 'sakuranite', 'gacha', 'coins'
        const amount = parseInt(args[1], 10);
        const quota = parseInt(args[2], 10);
        const expirationHours = parseInt(args[3], 10);

        if (isNaN(amount) || isNaN(quota) || isNaN(expirationHours)) {
            return ctx.reply('Amount, quota, and expiration hours must be numbers.');
        }

        if (type === 'coins' && !isLeader(userId)) {
            return ctx.reply('Hanya Leader yang bisa membuat redeem code tipe coins.');
        }

        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const expirationTimestamp = moment().add(expirationHours, 'hours').valueOf();

        const redeemCodes = db.get('redeem_codes') || {};
        redeemCodes[code] = {
            type,
            amount,
            quota,
            claimed_by: [],
            expiration: expirationTimestamp
        };
        db.set('redeem_codes', redeemCodes);

        return ctx.reply(`Redeem code created successfully!\n\nCode: \`${code}\`\nType: ${type}\nAmount: ${amount}\nQuota: ${quota}\nExpires in: ${expirationHours} hours`);
    }
};
