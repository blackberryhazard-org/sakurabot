const tools = {
    utils: require("./utils.js"),
    api: require("./utils.js"), // Alias to support tools.api.createUrl
    cmd: require("./cmd.js"),
    list: require("./list.js"),
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
    msg: require("./msg.js")
};

module.exports = tools;
