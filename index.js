import "./load_globals.js";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import config from "./config.js";
import startTelegramBot from "./tg/socket.js";

try {
  await startTelegramBot(config);
} catch (error) {
  console.error("Failed to initialize Telegram Bot:", error);
}

const WA_CWD = fileURLToPath(new URL(".", import.meta.url));
const SETUP_PATH = fileURLToPath(new URL("./wa/socket.js", import.meta.url));
const LOAD_GLOBALS_PATH = fileURLToPath(
  new URL("./load_globals.js", import.meta.url),
);

const StartSakurabot = () => {
  const instance = spawn(
    process.execPath,
    [
      "--import",
      LOAD_GLOBALS_PATH,
      ...process.execArgv,
      SETUP_PATH,
      ...process.argv.slice(2),
    ],
    {
      cwd: WA_CWD,
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    },
  );

  instance.once("message", (data) => {
    if (data === "leak" || data === "reset") {
      console[data === "leak" ? "warn" : "log"](
        data === "leak"
          ? "⚠️ RAM limit reached, restarting..."
          : "🔃 Restarting...",
      );
      instance.kill("SIGTERM");
    }
  });

  instance.once("exit", (code) => {
    console.error(`⚠️ Exited with code ${code}`);
    if (code !== 0) setTimeout(StartSakurabot, 2000);
  });
};

StartSakurabot();
