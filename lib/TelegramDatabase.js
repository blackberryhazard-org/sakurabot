import { LocalDatabase } from "./Database.js";

export const TelegramDatabase = (databasePath = "data/tg/database.json") => {
  const db = LocalDatabase(databasePath);

  let users = new Map();
  let scripts = [];
  let redeemCodes = new Map();
  let settings = { maintenance: false };

  return {
    users,
    scripts,
    redeemCodes,
    settings,

    updateUser(id, value) {
      users.set(String(id), {
        ...(users.get(String(id)) || {}),
        ...value,
      });
    },
    getUser(id) {
      return users.get(String(id));
    },
    hasUser(id) {
      return users.has(String(id));
    },
    deleteUser(id) {
      users.delete(String(id));
    },

    addScript(script) {
      scripts.push(script);
    },
    getScripts() {
      return scripts;
    },
    removeScript(index) {
      scripts.splice(index, 1);
    },

    updateRedeemCode(code, value) {
      redeemCodes.set(code, {
        ...(redeemCodes.get(code) || {}),
        ...value,
      });
    },
    getRedeemCode(code) {
      return redeemCodes.get(code);
    },
    hasRedeemCode(code) {
      return redeemCodes.has(code);
    },
    deleteRedeemCode(code) {
      redeemCodes.delete(code);
    },

    getSetting() {
      return settings;
    },
    updateSetting(value) {
      settings = { ...settings, ...value };
    },

    async readFromFile() {
      const raw = await db.read();

      users.clear();
      for (const [id, data] of Object.entries(raw.users || {})) {
        if (data.coin === null || data.coin === undefined) data.coin = 0;
        if (!data.lastClaim) data.lastClaim = 0;
        if (data.isBanned === undefined) data.isBanned = false;
        if (data.isVip === undefined) data.isVip = false;
        if (data.misiSelesai === undefined) data.misiSelesai = false;
        if (!data.claimedMissions) data.claimedMissions = {};
        users.set(String(id), data);
      }

      scripts.length = 0;
      if (Array.isArray(raw.scripts)) {
        scripts.push(...raw.scripts);
      }

      redeemCodes.clear();
      for (const [code, data] of Object.entries(raw.redeemCodes || {})) {
        redeemCodes.set(code, data);
      }

      settings = Object.assign({ maintenance: false }, raw.settings || {});
    },

    async writeToFile() {
      const out = {
        users: {},
        scripts: [...scripts],
        redeemCodes: {},
        settings: settings,
      };

      for (const [id, data] of users) out.users[id] = data;
      for (const [code, data] of redeemCodes) out.redeemCodes[code] = data;

      await db.write(out);
    },

    async clearAll() {
      users.clear();
      scripts.length = 0;
      redeemCodes.clear();
      settings = { maintenance: false };
      await this.writeToFile();
    },
  };
};
