const sawitUtils = require("sawit-utils");
const convertMsToDuration = sawitUtils.convertMsToDuration;
const formatSize = sawitUtils.formatSize;

function generateCmdExample(used, args) {
    if (!used || !args) return `${formatter.inlineCode("used")} atau ${formatter.inlineCode("args")} harus diberikan!`;
    return `Contoh: ${formatter.inlineCode(`${used.prefix + used.command} ${args}`)}`;
}

function generateInstruction(actions, mediaTypes) {
    if (!actions || !actions.length) return `${formatter.inlineCode("actions")} yang diperlukan harus ditentukan!`;

    let translatedMediaTypes;
    if (typeof mediaTypes === "string") {
        translatedMediaTypes = [mediaTypes];
    } else if (Array.isArray(mediaTypes)) {
        translatedMediaTypes = mediaTypes;
    } else {
        return `${formatter.inlineCode("mediaTypes")} harus berupa string atau array string!`;
    }

    const mediaTypeTranslations = {
        audio: "audio",
        document: "dokumen",
        gif: "GIF",
        image: "gambar",
        sticker: "stiker",
        text: "teks",
        video: "video",
        viewOnce: "sekali lihat"
    };

    const translatedMediaTypeList = translatedMediaTypes.map(type => mediaTypeTranslations[type]);

    let mediaTypesList;
    if (translatedMediaTypeList.length > 1) {
        const lastMediaType = translatedMediaTypeList[translatedMediaTypeList.length - 1];
        mediaTypesList = `${translatedMediaTypeList.slice(0, -1).join(", ")}, atau ${lastMediaType}`;
    } else {
        mediaTypesList = translatedMediaTypeList[0];
    }

    const actionTranslations = {
        send: "Kirim",
        reply: "Balas"
    };

    const instructions = actions.map(action => `${actionTranslations[action]}`);
    const actionList = instructions.join(actions.length > 1 ? " atau " : "");
    return `ⓘ ${formatter.italic(`${actionList} ${mediaTypesList}!`)}`;
}

function generatesFlagInfo(flags) {
    if (!flags || typeof flags !== "object") return `${formatter.inlineCode("flags")} harus berupa objek!`;
    return "Flag:\n" +
        Object.entries(flags).map(([flag, description]) => `- ${formatter.inlineCode(flag)}: ${description}`).join("\n");
}

function generateNotes(notes) {
    if (!notes || !Array.isArray(notes)) return `${formatter.inlineCode("notes")} harus berupa string!`;
    return "Catatan:\n" +
        notes.map(note => `- ${note}`).join("\n");
}

module.exports = {
    convertMsToDuration,
    formatSize,
    generateCmdExample,
    generateInstruction,
    generatesFlagInfo,
    generateNotes
};
