const growth = Math.pow(Math.PI / Math.E, 1.618) * Math.E * 0.75;

function xpRange(level, multiplier = 38) {
    if (level < 0) throw new TypeError("level cannot be negative value");
    const lvl = Math.floor(level);
    const min = lvl === 0 ? 0 : Math.round(Math.pow(lvl, growth) * multiplier) + 1;
    const max = Math.round(Math.pow(lvl + 1, growth) * multiplier);
    return {
        min,
        max,
        xp: max - min
    };
}

function findLevel(xp, multiplier = 38) {
    if (xp === Infinity) return Infinity;
    if (isNaN(xp)) return NaN;
    if (xp <= 0) return -1;
    let lvl = 0;
    while (xpRange(lvl, multiplier).min <= xp) {
        lvl++;
    }
    return --lvl;
}

function canLevelUp(level, xp, multiplier = 38) {
    if (level < 0) return false;
    if (xp === Infinity) return true;
    if (isNaN(xp)) return false;
    if (xp <= 0) return false;
    return level < findLevel(xp, multiplier);
}

module.exports = {
    xpRange,
    findLevel,
    canLevelUp
};
