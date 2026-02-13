module.exports = {
    name: "mining",
    code: async (sock, m, { sender, db, from, items, getMiningTickets, updateMiningTickets, getMiningRate, updateMiningRate, args, prefix }) => {
        if (args[0] === "upgrade") {
            const currentRate = getMiningRate(sender);
            let nextRate, cost;

            if (currentRate < 0.25) {
                nextRate = 0.25;
                cost = 5;
            } else if (currentRate < 0.50) {
                nextRate = 0.50;
                cost = 10;
            } else {
                return await sock.sendMessage(from, { text: "Kecepatan mining Anda sudah maksimal (0.50)." }, { quoted: m });
            }

            const tickets = getMiningTickets(sender);
            if (tickets < cost) {
                return await sock.sendMessage(from, { text: `Anda butuh ${cost} Tiket Mining untuk upgrade ke rate ${nextRate}. Tiket Anda: ${tickets}.` }, { quoted: m });
            }

            updateMiningTickets(sender, tickets - cost);
            updateMiningRate(sender, nextRate);

            return await sock.sendMessage(from, { text: `✅ Berhasil! Kecepatan mining Anda telah ditingkatkan menjadi *${nextRate}*.` }, { quoted: m });
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

            text += `\nRate Anda: *${getMiningRate(sender)}*\n`;
            text += `Tiket Anda: *${getMiningTickets(sender)}*`;
            return await sock.sendMessage(from, { text }, { quoted: m });
        }

        const price = items[itemName];
        const ticketCost = price >= 500 ? 2 : 1;
        const tickets = getMiningTickets(sender);

        if (tickets < ticketCost) {
            return await sock.sendMessage(from, { text: `Anda butuh ${ticketCost} Tiket Mining untuk menambang ${itemName}. Tiket Anda: ${tickets}.` }, { quoted: m });
        }

        updateMiningTickets(sender, tickets - ticketCost);
        const rate = getMiningRate(sender);
        const amount = Math.floor(rate * 60);

        await sock.sendMessage(from, { text: `⛏️ Menambang *${itemName}*... mohon tunggu 60 detik.` }, { quoted: m });

        setTimeout(async () => {
            const inventory = db.get(`inventory.${sender}`) || {};
            inventory[itemName] = (inventory[itemName] || 0) + amount;
            db.set(`inventory.${sender}`, inventory);

            await sock.sendMessage(from, { text: `✅ Selesai! Anda mendapatkan *${amount}x ${itemName}*.` }, { quoted: m });
        }, 60000);
    }
};
