module.exports = {
    name: "ping",
    code: async (sock, m, { from }) => {
        const tgStatus = global.botStatus.tg ? "Online" : "Offline";
        const text = "*PONG!*\n\n" +
                     `*TG Bot Status*: ${tgStatus}`;
        await sock.sendMessage(from, { text }, { quoted: m });
    }
};
