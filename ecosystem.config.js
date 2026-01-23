module.exports = {
    apps: [{
        name: "capinetta-bot",
        script: "./index.js",
        watch: false,
        env: {
            NODE_ENV: "production",
        }
    }]
};