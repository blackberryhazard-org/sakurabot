const tools = {
    utils: require("./shared/utils.js"),
    api: require("./shared/utils.js"), // Alias to support tools.api.createUrl
    cmd: require("./shared/cmd.js"),
    list: require("./shared/list.js"),
    mime: {
        lookup: (ext) => {
            const mimes = {
                "jpg": "image/jpeg",
                "jpeg": "image/jpeg",
                "png": "image/png",
                "gif": "image/gif",
                "mp4": "video/mp4",
                "mp3": "audio/mpeg",
                "pdf": "application/pdf",
                "zip": "application/zip"
            };
            return mimes[ext.toLowerCase()] || "application/octet-stream";
        }
    },
    msg: require("./shared/msg.js")
};

module.exports = tools;
