module.exports = {
    name: "owner",
    category: "information",
    code: async (ctx, { config }) => {
        const owner = config.owner;
        const coOwners = owner.co_owners || [];

        let message = "*Owner Information*\n\n";
        message += `*Name:* ${owner.name}\n`;
        message += `*Telegram:* ${owner.telegramUsername}\n`;
        message += `*Organization:* ${owner.organization}\n`;

        if (coOwners.length > 0) {
            message += "\n*Co-Owners*\n";
            coOwners.forEach(co => {
                message += `\n- *Name:* ${co.name}\n`;
                if (co.organization) {
                    message += `  *Organization:* ${co.organization}\n`;
                }
            });
        }

        ctx.reply(message, { parse_mode: "Markdown" });
    }
};
