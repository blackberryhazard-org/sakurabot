module.exports = {
    name: 'inventory',
    aliases: ['inv'],
    code: async (sock, m, { sender, getInventory }) => {
        const inv = getInventory(sender);

        let text = `— *INVENTORY* —\n\n`;
        let itemsText = '';
        Object.keys(inv).forEach(item => {
            itemsText += `➛ *${item}*: ${inv[item]}\n`;
        });

        if (!itemsText) itemsText = 'Kosong';
        text += itemsText;

        await sock.sendMessage(m.key.remoteJid, { text }, { quoted: m });
    }
};
