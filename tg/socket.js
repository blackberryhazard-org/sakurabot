import { Telegraf } from 'telegraf';
import fs from 'fs/promises';
import path from 'path';

const startTelegramBot = async (config) => {
    if (!config.tgbot || !config.tgbot.botfatherToken || config.tgbot.botfatherToken === "BOTFATHER_TOKEN") {
        console.log("Telegram bot token not provided, skipping Telegram bot initialization.");
        return null;
    }

    const bot = new Telegraf(config.tgbot.botfatherToken);

    // Error handling setup
    bot.catch((err, ctx) => {
        global.consolefy?.error(err) || console.error(`Ooops, encountered an error for ${ctx.updateType}`, err);
    });

    // Owner check middleware
    bot.use(async (ctx, next) => {
        const userId = ctx.from?.id?.toString();
        if (userId && userId !== config.tgbot.ownerId) {
             return;
        }
        await next();
    });

    // Command loading logic
    const pluginsPath = path.join(process.cwd(), 'tg', 'plugins');

    try {
        await fs.access(pluginsPath);
    } catch {
        await fs.mkdir(pluginsPath, { recursive: true });
    }

    const loadPlugins = async () => {
        try {
            const files = await fs.readdir(pluginsPath);
            for (const file of files) {
                if (file.endsWith('.js')) {
                    try {
                        const pluginUrl = new URL(`file://${path.join(pluginsPath, file)}`);
                        const plugin = await import(pluginUrl);
                        if (plugin.default && typeof plugin.default === 'function') {
                            plugin.default(bot);
                        }
                    } catch (e) {
                         global.consolefy?.error(e) || console.error(`Failed to load plugin ${file}:`, e);
                    }
                }
            }
        } catch (e) {
             global.consolefy?.error(e) || console.error("Error reading tg plugins directory", e);
        }
    };

    await loadPlugins();

    bot.launch().then(() => {
        console.log("✅ Telegram bot started successfully.");
        global.tgBot = bot;
    }).catch(err => {
        global.consolefy?.error(err) || console.error("❌ Failed to start Telegram bot:", err);
    });

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    return bot;
};

export default startTelegramBot;
