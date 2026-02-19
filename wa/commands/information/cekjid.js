module.exports = {
    name: "cekjid",
    category: "information",
    description: "Cek JID grup atau channel berdasarkan link undangan.",
    code: async (sock, m, { args, ctx }) => {
        const type = args[0]?.toLowerCase();
        const link = args[1];

        if (!type || !["group", "channel"].includes(type) || !link) {
            return ctx.reply("Penggunaan: /cekjid {group|channel} {link_undangan}");
        }

        if (type === "group") {
            const groupRegex = /chat\.whatsapp\.com\/([a-zA-Z0-9]+)/;
            const match = link.match(groupRegex);
            const inviteCode = match ? match[1] : link;

            try {
                const response = await sock.groupGetInviteInfo(inviteCode);
                const text = "*Informasi Grup* 👥\n\n" +
                    `➛ *JID*: ${response.id}\n` +
                    `➛ *Nama*: ${response.subject}\n` +
                    `➛ *Owner*: ${response.owner || "Tidak diketahui"}\n` +
                    `➛ *Dibuat*: ${new Date(response.creation * 1000).toLocaleString("id-ID")}\n` +
                    `➛ *Deskripsi*: ${response.desc || "-"}`;
                return ctx.reply(text);
            } catch (err) {
                return ctx.reply(`❌ Gagal mengambil info grup. Pastikan link valid atau bot tidak diblokir.\nError: ${err.message}`);
            }
        } else if (type === "channel") {
            const channelRegex = /whatsapp\.com\/channel\/([a-zA-Z0-9]+)/;
            const match = link.match(channelRegex);
            const channelCode = match ? match[1] : link;

            try {
                const data = await sock.newsletterMetadata("invite", channelCode);
                const text = "*Informasi Channel* 📢\n\n" +
                    `➛ *JID*: ${data.id}\n` +
                    `➛ *Nama*: ${data.name}\n` +
                    `➛ *Status*: ${data.state}\n` +
                    `➛ *Pengikut*: ${data.subscribers || "Tidak diketahui"}\n` +
                    `➛ *Deskripsi*: ${data.description || "-"}`;
                return ctx.reply(text);
            } catch (err) {
                return ctx.reply(`❌ Gagal mengambil info channel. Pastikan link valid.\nError: ${err.message}`);
            }
        }
    }
};
