import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import config from './config.js';
import startTelegramBot from './tg/index.js';

// Start the telegram bot
try {
    startTelegramBot(config);
} catch (error) {
    console.error("Failed to initialize Telegram Bot:", error);
}

// Start Starseed (WhatsApp)
const SETUP_PATH = fileURLToPath(new URL('./socket.js', import.meta.url));
const CONFIG_PATH = fileURLToPath(new URL('./config.js', import.meta.url));

const StartStarseed = () => {
    const instance = spawn(process.execPath, [
       '--import', CONFIG_PATH,
       ...process.execArgv,
       SETUP_PATH,
       ...process.argv.slice(2)
    ], {
       stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    instance.once('message', data => {
       if (data === 'leak' || data === 'reset') {
          console[data === 'leak' ? 'warn' : 'log'](
             data === 'leak'
                ? '⚠️ RAM limit reached, restarting...'
                : '🔃 Restarting...'
          );
          instance.kill('SIGTERM');
       }
    });

    instance.once('exit', code => {
       console.error(`⚠️ Exited with code ${code}`);
       if (code !== 0) setTimeout(StartStarseed, 2000);
    });
};

StartStarseed();
