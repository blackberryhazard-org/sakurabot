const { GoogleGenAI } = require("@google/genai");
const config = require("../../../config.js");

module.exports = {
    name: "gemini",
    description: "Tanya AI (Google Gemini)",
    category: "tool",
    aliases: ["ai", "ask"],
    code: async (sock, m, helpers) => {
        const { ctx } = helpers;

        try {
            // Get message text, handling both simple text and extended text
            const msgText = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
            const args = msgText.split(" ").slice(1);

            if (args.length === 0) {
                return ctx.reply("Silakan berikan pertanyaan. Contoh: /gemini Siapa penemu lampu?");
            }

            const query = args.join(" ");

            const apikey = config.services?.misc?.gemini;
            if (!apikey || apikey === "your-api-key-here") {
                return ctx.reply("API Key Gemini belum dikonfigurasi di config.js (services.misc.gemini).");
            }

            await ctx.reply("⏳ Sedang memproses...");

            try {
                const ai = new GoogleGenAI({ apiKey: apikey });
                const response = await ai.models.generateContent({
                    model: "gemini-3-flash-preview",
                    contents: query,
                });

                if (response && response.text) {
                    return ctx.reply(response.text);
                } else {
                    return ctx.reply("Gagal mendapatkan respon dari Gemini. Format tidak sesuai.");
                }
            } catch (apiError) {
                console.error("Gemini API Error:", apiError.message);
                return ctx.reply("Terjadi kesalahan saat menghubungi API Gemini. Coba lagi nanti.");
            }
        } catch (error) {
            console.error("Error in /gemini command:", error);
            return ctx.reply(`Maaf, terjadi kesalahan: ${error.message}`);
        }
    }
};
