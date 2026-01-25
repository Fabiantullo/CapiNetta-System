module.exports = {
    apps: [{
        name: "capinetta-general",
        script: "./index-general.js",
        watch: false,
        env: {
            NODE_ENV: "production",
        }
    }, {
        name: "capinetta-whitelist",
        script: "./index-whitelist.js",
        watch: false,
        env: {
            NODE_ENV: "production",
        }
    }]
};