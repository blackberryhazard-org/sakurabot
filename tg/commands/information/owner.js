module.exports = {
    name: "owner",
    category: "information",
    code: async (ctx, { config }) => {
        const owner = config.owner;
        const coOwners = owner.co_owners || [];

        let message = "<b>Owner Information</b>\n\n";
        message += `<b>Name:</b> ${owner.name}\n`;
        message += `<b>Telegram:</b> ${owner.telegramUsername}\n`;
        message += `<b>Organization:</b> ${owner.organization}\n`;

        if (coOwners.length > 0) {
            message += "\n<b>Co-Owners</b>\n";
            coOwners.forEach(co => {
                message += `\n- <b>Name:</b> ${co.name}\n`;
                if (co.organization) {
                    message += `  <b>Organization:</b> ${co.organization}\n`;
                }
            });
        }

        ctx.reply(message, { parse_mode: "HTML" });
    }
};
