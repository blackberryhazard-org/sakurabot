module.exports = {
    name: "ping",
    category: "information",
    aliases: ["p"],
    code: async (ctx) => {
        const startTime = new Date();
        const sentMessage = await ctx.reply("Pinging...");
        const endTime = new Date();
        const latency = endTime - startTime;
        const waBotStatus = global.botStatus.wa ? "Online" : "Offline";

        ctx.telegram.editMessageText(
            ctx.chat.id,
            sentMessage.message_id,
            null,
            `Pong! Latency: ${latency}ms\nWhatsApp Bot: ${waBotStatus}`
        );
    }
};
