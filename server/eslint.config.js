const js = require("@eslint/js")

module.exports = [
    { ignores: ["loadtest/**", "_check.js", "_test_conn.js"] },
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                require: "readonly",
                module: "writable",
                exports: "writable",
                __dirname: "readonly",
                __filename: "readonly",
                process: "readonly",
                console: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
            "no-console": "off"
        }
    },
    {
        files: ["**/__tests__/**/*.js"],
        languageOptions: {
            globals: {
                jest: "readonly",
                describe: "readonly",
                it: "readonly",
                expect: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly"
            }
        }
    }
]
