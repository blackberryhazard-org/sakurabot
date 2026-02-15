const config = require("../config.json");

/**
 * Registers user if not already in database.
 * @param {Object} db
 * @param {string} jid
 */
const registerUser = (db, jid) => {
    const users = db.get("users") || [];
    if (!users.includes(jid)) {
        users.push(jid);
        db.set("users", users);
    }
};

/**
 * Checks if user is the bot leader.
 * @param {string} jid
 * @returns {boolean}
 */
const isLeader = (jid) => {
    if (!jid) return false;
    return config.owner.id === jid.split("@")[0];
};

/**
 * Checks if user is a manager.
 * @param {Object} db
 * @param {string} jid
 * @returns {boolean}
 */
const isManager = (db, jid) => {
    if (!jid) return false;
    const managers = db.get("managers") || [];
    return managers.includes(jid);
};

/**
 * Checks if user is an owner (leader or manager).
 * @param {Object} db
 * @param {string} jid
 * @returns {boolean}
 */
const isOwner = (db, jid) => {
    return isLeader(jid) || isManager(db, jid);
};

/**
 * Checks if user is a premium user.
 * @param {Object} db
 * @param {string} jid
 * @returns {boolean}
 */
const isPremium = (db, jid) => {
    const premiumUsers = db.get("premium") || [];
    return premiumUsers.includes(jid);
};

module.exports = {
    registerUser,
    isLeader,
    isManager,
    isOwner,
    isPremium
};
