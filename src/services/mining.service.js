class MiningService {
    constructor(economyService, inventoryService) {
        this.economyService = economyService;
        this.inventoryService = inventoryService;
    }

    getTickets(userId) {
        return this.economyService.getBalance(userId, "mining_tickets");
    }

    updateTickets(userId, amount) {
        return this.economyService.updateBalance(userId, amount, "mining_tickets", "mining_update");
    }

    getRate(userId) {
        return this.economyService.getBalance(userId, "mining_rate") || 0.10;
    }

    updateRate(userId, rate) {
        return this.economyService.updateBalance(userId, rate, "mining_rate", "mining_upgrade");
    }

    /**
     * Attempts to upgrade the mining rate.
     * @param {string|number} userId
     * @returns {Object} result { success: boolean, message: string, nextRate: number }
     */
    upgrade(userId) {
        const currentRate = this.getRate(userId);
        let nextRate, cost;

        if (currentRate < 0.25) {
            nextRate = 0.25;
            cost = 5;
        } else if (currentRate < 0.50) {
            nextRate = 0.50;
            cost = 10;
        } else {
            return { success: false, message: "Your mining rate is already at the maximum (0.50)." };
        }

        const tickets = this.getTickets(userId);
        if (tickets < cost) {
            return {
                success: false,
                message: `You need ${cost} Mining Tickets to upgrade to ${nextRate} rate. You have ${tickets}.`,
                needed: cost,
                have: tickets
            };
        }

        this.updateTickets(userId, tickets - cost);
        this.updateRate(userId, nextRate);

        return { success: true, message: `Success! Your mining rate has been upgraded to ${nextRate}.`, nextRate };
    }

    /**
     * Starts a mining session.
     * @param {string|number} userId
     * @param {string} itemName
     * @param {Object} items - Item prices/definitions
     * @returns {Object} result { success: boolean, message: string, amount: number, ticketCost: number }
     */
    startMining(userId, itemName, items) {
        if (!items[itemName]) {
            return { success: false, message: "Item not found." };
        }

        const price = items[itemName];
        const ticketCost = price >= 500 ? 2 : 1;
        const tickets = this.getTickets(userId);

        if (tickets < ticketCost) {
            return {
                success: false,
                message: `You need ${ticketCost} Mining Tickets to mine ${itemName}. You have ${tickets}.`,
                needed: ticketCost,
                have: tickets
            };
        }

        this.updateTickets(userId, tickets - ticketCost);
        const rate = this.getRate(userId);
        const amount = Math.floor(rate * 60);

        return {
            success: true,
            message: `Mining ${itemName}... please wait 60 seconds.`,
            amount,
            ticketCost
        };
    }

    /**
     * Completes the mining session and adds the item to inventory.
     * @param {string|number} userId
     * @param {string} itemName
     * @param {number} amount
     */
    completeMining(userId, itemName, amount) {
        this.inventoryService.addItem(userId, itemName, amount);
    }
}

module.exports = MiningService;
