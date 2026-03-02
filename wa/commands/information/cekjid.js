module.exports = {
    name: "cekjid",
    category: "information",
    description: "Cek JID grup atau channel berdasarkan link undangan.",
    code: async (sock, m, { args, ctx }) => {
        let type = args[0]?.toLowerCase();
        let link = args[1];

        // If no type provided, but a link is present, try to guess the type
        if (!type || (!["group", "channel"].includes(type) && /whatsapp\.com\/(?:chat|channel)\//.test(type))) {
            link = type;
            if (link.includes("chat.whatsapp.com")) type = "group";
            else if (link.includes("whatsapp.com/channel")) type = "channel";
            else return ctx.reply("Penggunaan: /cekjid {group|channel} {link_undangan}");
        }

        if (!link) return ctx.reply("Penggunaan: /cekjid {group|channel} {link_undangan}");

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

                // Safety check for metadata structure
                if (!data || typeof data !== 'object') {
                    throw new Error("Metadata channel tidak ditemukan atau format tidak valid.");
                }

                const text = "*Informasi Channel* 📢\n\n" +
                    `➛ *JID*: ${data.id || "N/A"}\n` +
                    `➛ *Nama*: ${data.name || "N/A"}\n` +
                    `➛ *Status*: ${data.state || "N/A"}\n` +
                    `➛ *Pengikut*: ${data.subscribers || "Tidak diketahui"}\n` +
                    `➛ *Deskripsi*: ${data.description || "-"}`;
                return ctx.reply(text);
            } catch (err) {
                // If it's a JSON parse error or similar unexpected token error
                if (err.message.includes("Unexpected token") || err.message.includes("JSON")) {
                    return ctx.reply(`❌ Terjadi kesalahan teknis saat parsing data channel. Ini mungkin masalah pada server WhatsApp atau versi library Baileys.\n\nError: ${err.message}`);
                }
                return ctx.reply(`❌ Gagal mengambil info channel. Pastikan link valid.\nError: ${err.message}`);
            }
        }
    }
};
