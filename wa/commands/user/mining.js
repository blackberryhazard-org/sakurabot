module.exports = {
    name: "mining",
    code: async (sock, m, { sender, from, items, mining, args, prefix }) => {
        if (args[0] === "upgrade") {
            const result = mining.upgrade(sender);
            if (!result.success) {
                return await sock.sendMessage(from, { text: result.message }, { quoted: m });
            }
            return await sock.sendMessage(from, { text: `✅ Berhasil! Kecepatan mining Anda telah ditingkatkan menjadi *${result.nextRate}*.` }, { quoted: m });
        }

        const itemNameInput = args[0];
        const itemName = Object.keys(items).find(k => k.toLowerCase() === itemNameInput?.toLowerCase());

        if (!itemNameInput || !itemName) {
            let text = "— *MINING SYSTEM* —\n\n" +
                `Gunakan ${prefix}mining {nama_item} atau ${prefix}mining upgrade\n\n` +
                "*Daftar Item*:\n";

            for (const [name, price] of Object.entries(items)) {
                const cost = price >= 500 ? 2 : 1;
                text += `➛ *${name}*: ${cost} Tiket\n`;
            }

            text += `\nRate Anda: *${mining.getRate(sender)}*\n`;
            text += `Tiket Anda: *${mining.getTickets(sender)}*`;
            return await sock.sendMessage(from, { text }, { quoted: m });
        }

        const result = mining.startMining(sender, itemName, items);
        if (!result.success) {
            return await sock.sendMessage(from, { text: result.message }, { quoted: m });
        }

        await sock.sendMessage(from, { text: `⛏️ Menambang *${itemName}*... mohon tunggu 60 detik.` }, { quoted: m });

        setTimeout(async () => {
            mining.completeMining(sender, itemName, result.amount);
            await sock.sendMessage(from, { text: `✅ Selesai! Anda mendapatkan *${result.amount}x ${itemName}*.` }, { quoted: m });
        }, 60000);
    }
};
