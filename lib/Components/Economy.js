/**
 * Sakuranite Economy Component
 */

export const Economy = (db) => {
  return {
    getSakuranite(jid) {
      const user = db.getUser(jid);
      return user ? user.sakuranite || 0 : 0;
    },
    addSakuranite(jid, amount) {
      if (!db.hasUser(jid)) return false;
      const user = db.getUser(jid);
      const current = user.sakuranite || 0;
      db.updateUser(jid, { sakuranite: current + amount });
      return true;
    },
    reduceSakuranite(jid, amount) {
      if (!db.hasUser(jid)) return false;
      const user = db.getUser(jid);
      const current = user.sakuranite || 0;
      if (current < amount) return false;
      db.updateUser(jid, { sakuranite: current - amount });
      return true;
    },
    setSakuranite(jid, amount) {
      if (!db.hasUser(jid)) return false;
      db.updateUser(jid, { sakuranite: Math.max(0, amount) });
      return true;
    },
  };
};
