const { sendProfileLog } = require("../../utils/logger");

module.exports = {
    name: "userUpdate",
    async execute(client, oldUser, newUser) {
        if (oldUser.username !== newUser.username) sendProfileLog(client, newUser, "Username", `**${oldUser.username}** → **${newUser.username}**`);
        if (oldUser.avatar !== newUser.avatar) sendProfileLog(client, newUser, "Avatar", "Cambio de avatar");
    },
};
