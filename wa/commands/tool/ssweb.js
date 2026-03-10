const axios = require("axios");

module.exports = {
    name: "ssweb",
    category: "tool",
    code: async (sock, m, { args, config, ctx }) => {
        const start = Date.now();
        let key = config.services.misc.screenshotmachine;
        let url = "google.com";
        let device = "mobile";
        let usedUserKey = false;

        if (args.length > 0) {
            // Check if first arg is a potential key (usually alphanumeric around 6 chars based on example)
            // or if it's a URL.
            const isUrl = (str) => /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(str);

            if (!isUrl(args[0]) && args[0].length < 15 && args.length > 1) {
                key = args[0];
                url = args[1];
                device = args[2] || "mobile";
                usedUserKey = true;
            } else {
                url = args[0] || "google.com";
                device = args[1] || "mobile";
            }
        }

        if (!url.startsWith("http")) url = "http://" + url;
        device = device.toLowerCase();

        const dimensions = {
            mobile: "375x667",
            tablet: "768x1024",
            desktop: "1024x768"
        };
        const dimension = dimensions[device] || dimensions.mobile;

        await ctx.reply(config.msg.wait);

        try {
            const apiUrl = `https://api.screenshotmachine.com?key=${key}&url=${encodeURIComponent(url)}&device=${device}&dimension=${dimension}&format=png&cacheLimit=0&delay=2000`;
            const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
            const ping = Date.now() - start;

            let caption = "📸 *HASIL SCREENSHOT*\n";
            caption += `URL: ${url}\n`;
            caption += `Ukuran: ${dimension}\n\n`;
            caption += `Selesai dalam ${ping}ms`;

            if (usedUserKey) {
                caption += "\n\nTerima kasih telah menyediakan key mu sendiri. Ini sangat membantu bagi owner untuk menghemat token penggunaan.";
            }

            await sock.sendMessage(m.key.remoteJid, { image: Buffer.from(response.data), caption }, { quoted: m });
        } catch (err) {
            await ctx.reply(`Gagal mengambil screenshot: ${err.message}`);
        }
    }
};
