const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                ...globals.node,
                ...globals.jest,
                config: "readonly",
                consolefy: "readonly",
                formatter: "readonly",
                tools: "readonly",
                formatUptime: "readonly",
                escapeHTML: "readonly",
                botStatus: "readonly",
                tgBot: "readonly",
                waSock: "readonly",
                waBot: "readonly",
                __dirname: "readonly"
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "indent": ["error", 4],
            "quotes": ["error", "double"],
            "semi": ["error", "always"],
        },
    },
];
