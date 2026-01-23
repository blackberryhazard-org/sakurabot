module.exports = {
    name: 'owner',
    category: 'information',
    code: async (ctx, { config }) => {
        const owner = config.owner;
        const coOwners = owner.co || [];

        let message = `<b>Informasi Pemilik</b>\n\n`;
        message += `<b>Nama:</b> ${owner.name}\n`;
        message += `<b>Telegram:</b> ${owner.usn_tele}\n`;
        message += `<b>Organisasi:</b> ${owner.organization}\n`;

        if (coOwners.length > 0) {
            message += `\n<b>Co-Owner</b>\n`;
            coOwners.forEach(co => {
                message += `\n- <b>Nama:</b> ${co.name}\n`;
                if (co.organization) {
                    message += `  <b>Organisasi:</b> ${co.organization}\n`;
                }
            });
        }

        ctx.reply(message, { parse_mode: 'HTML' });
    }
};
