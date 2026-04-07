import { Telegraf } from 'telegraf';

const startTelegramBot = (config) => {
    if (!config.tgbot || !config.tgbot.botfatherToken || config.tgbot.botfatherToken === "BOTFATHER_TOKEN") {
        console.log("Telegram bot token not provided, skipping Telegram bot initialization.");
        return null;
    }

    const bot = new Telegraf(config.tgbot.botfatherToken);

    bot.command('ping', (ctx) => {
        const start = Date.now();
        ctx.reply('Pong!').then((msg) => {
            const end = Date.now();
            ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `Pong! 🏓\nLatency: ${end - start}ms`);
        }).catch(err => {
            console.error("Error in ping command:", err);
            ctx.reply('Pong! 🏓');
        });
    });

    bot.launch().then(() => {
        console.log("✅ Minimal Telegram bot started successfully.");
    }).catch(err => {
        console.error("❌ Failed to start Telegram bot:", err);
    });

    return bot;
};

export default startTelegramBot;
