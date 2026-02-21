class LinkingService {
    constructor(tgDb, waDb, economyTg, economyWa) {
        this.tgDb = tgDb;
        this.waDb = waDb;
        this.economyTg = economyTg;
        this.economyWa = economyWa;
    }

    getWaJid(tgId) {
        const data = this.tgDb.get("links") || {};
        return data[tgId];
    }

    getTgId(waJid) {
        const data = this.waDb.get("links") || {};
        return data[waJid];
    }

    link(tgId, waJid) {
        // Update TG DB
        const tgLinks = this.tgDb.get("links") || {};
        tgLinks[tgId] = waJid;
        this.tgDb.set("links", tgLinks);

        // Update WA DB
        const waLinks = this.waDb.get("links") || {};
        waLinks[waJid] = tgId;
        this.waDb.set("links", waLinks);

        return true;
    }

    unlink(id, platform = "tg") {
        if (platform === "tg") {
            const waJid = this.getWaJid(id);
            if (!waJid) return false;

            const tgLinks = this.tgDb.get("links") || {};
            delete tgLinks[id];
            this.tgDb.set("links", tgLinks);

            const waLinks = this.waDb.get("links") || {};
            delete waLinks[waJid];
            this.waDb.set("links", waLinks);
        } else {
            const tgId = this.getTgId(id);
            if (!tgId) return false;

            const waLinks = this.waDb.get("links") || {};
            delete waLinks[id];
            this.waDb.set("links", waLinks);

            const tgLinks = this.tgDb.get("links") || {};
            delete tgLinks[tgId];
            this.tgDb.set("links", tgLinks);
        }
        return true;
    }

    transferSakuranite(fromId, fromPlatform, amount) {
        const economyFrom = fromPlatform === "tg" ? this.economyTg : this.economyWa;
        const economyTo = fromPlatform === "tg" ? this.economyWa : this.economyTg;
        const toId = fromPlatform === "tg" ? this.getWaJid(fromId) : this.getTgId(fromId);

        if (!toId) throw new Error("Akun belum terhubung!");

        const fee = Math.floor(amount * 0.1);
        const received = amount - fee;

        if (economyFrom.getBalance(fromId, "sakuranite") < amount) {
            throw new Error("Saldo Sakuranite tidak cukup!");
        }

        economyFrom.subtractBalance(fromId, amount, "sakuranite", `transfer_to_${fromPlatform === "tg" ? "wa" : "tg"}`);
        economyTo.addBalance(toId, received, "sakuranite", `transfer_from_${fromPlatform === "tg" ? "tg" : "wa"}`);

        return { amount, fee, received, toId };
    }
}

module.exports = LinkingService;
