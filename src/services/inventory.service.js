// Item definition for the items system in the telegram bot 
const items_serpulo = {
    Copper: 75,
    Lead: 100,
    Titanium: 250,
    Thorium: 500,
};

// Item definition for the items system in the WhatsApp bot 
const items_erekir = {
    Beryllium: 100,
    Graphite: 200,
    Tungsten: 500,
    Thorium: 1000,
    Oxide: 2000,
    Carbide: 5000
};

class InventoryService {
    constructor(db) {
        this.db = db;
    }

    getInventory(userId) {
        return this.db.get(`inventory.${userId}`) || {};
    }

    addItem(userId, item, amount) {
        const inv = this.getInventory(userId);
        inv[item] = (inv[item] || 0) + amount;
        if (inv[item] <= 0) delete inv[item];
        this.db.set(`inventory.${userId}`, inv);
        return inv;
    }

    removeItem(userId, item, amount) {
        return this.addItem(userId, item, -amount);
    }

    hasItem(userId, item, amount = 1) {
        const inv = this.getInventory(userId);
        return (inv[item] || 0) >= amount;
    }
}

module.exports = InventoryService;
