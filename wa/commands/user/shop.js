module.exports = {
    name: 'shop',
    code: async (sock, m, { sender, args, items, getInventory, updateInventory, getSakuranite, updateSakuranite, prefix }) => {
        const action = args[0]?.toLowerCase();

        if (action === 'sell') {
            let inputItem = args[1];
            if (!inputItem) return await sock.sendMessage(m.key.remoteJid, { text: `Gunakan: ${prefix}shop sell {nama_item} {jumlah}` }, { quoted: m });

            const itemName = Object.keys(items).find(key => key.toLowerCase() === inputItem.toLowerCase());
            const amount = parseInt(args[2]) || 1;

            if (!itemName) {
                return await sock.sendMessage(m.key.remoteJid, { text: `Item *${inputItem}* tidak ditemukan!\nItem yang bisa dijual: ${Object.keys(items).join(', ')}` }, { quoted: m });
            }

            if (amount <= 0) return await sock.sendMessage(m.key.remoteJid, { text: 'Jumlah harus lebih dari 0!' }, { quoted: m });

            const inv = getInventory(sender);
            if (!inv[itemName] || inv[itemName] < amount) {
                return await sock.sendMessage(m.key.remoteJid, { text: `Anda tidak memiliki cukup *${itemName}*! (Punya: ${inv[itemName] || 0})` }, { quoted: m });
            }

            const totalSell = items[itemName] * amount;
            updateInventory(sender, itemName, -amount);
            updateSakuranite(sender, getSakuranite(sender) + totalSell);

            const text = `— *SHOP SELL* —\n\n` +
                `Berhasil menjual *${amount} ${itemName}* seharga *${totalSell} Sakuranite*.\n` +
                `Sakuranite sekarang: *${getSakuranite(sender)}*`;

            await sock.sendMessage(m.key.remoteJid, { text }, { quoted: m });
        } else {
            let text = `— *SHOP LIST* —\n\n` +
                `Gunakan *${prefix}shop sell {nama_item} {jumlah}* untuk menjual item.\n\n` +
                `*Daftar Harga Jual*:\n`;

            Object.keys(items).forEach(item => {
                text += `➛ *${item}*: ${items[item]} Sakuranite\n`;
            });

            await sock.sendMessage(m.key.remoteJid, { text }, { quoted: m });
        }
    }
};
