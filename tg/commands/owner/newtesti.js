module.exports = {
    name: 'newtesti',
    category: 'owner',
    code: async (ctx, { isOwner }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('This command is for owners only.');
        }

        try {
            const args = ctx.message.text.split(' ').slice(1);
            const [id_channel, id_transaksi, nama, harga, buyer, ...pesan_tambahan_parts] = args;
            const pesan_tambahan = pesan_tambahan_parts.join(' ');

            if (!id_channel || !id_transaksi || !nama || !harga || !buyer) {
                return ctx.reply('Usage: /newtesti {id_channel} {id_transaksi} {nama} {harga} {buyer} {pesan_tambahan}');
            }

            const itemName = nama.replace(/\+/g, ' ');
            const caption = `Done wak😹

ID Transaksi: ${id_transaksi}
Nama Item: ${itemName}
Harga: ${harga}
Buyer: ${buyer}

${pesan_tambahan}
            `;

            if (ctx.message.reply_to_message && ctx.message.reply_to_message.photo) {
                const photo = ctx.message.reply_to_message.photo.pop().file_id;
                await ctx.telegram.sendPhoto(id_channel, photo, { caption });
            } else {
                await ctx.telegram.sendMessage(id_channel, caption);
            }

            ctx.reply('Testimonial sent successfully!');
        } catch (error) {
            console.error('Failed to send testimonial:', error);
            ctx.reply('Failed to send testimonial. Please check the channel ID and make sure the bot has permission to post.');
        }
    }
};
