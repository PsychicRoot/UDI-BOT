const {
  STAFF_ROLE_ID,
  TRIAL_SUPPORT_ID,
  OWNERS,
} = require("../../constants/roles");
const { logError } = require("../../helpers/logError");
module.exports = {
  name: "messageDelete",
  async execute(message, client) {
    const inviteRegex = new RegExp(
      /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+[a-z]/g
    );
    const steamGiftRegex = new RegExp(
      /(https?:\/\/)?(www\.)?(steamcommunity\.com\/gift)\/.+[a-zA-Z0-9]/g
    );
    //Invite Filter
    if (
      (inviteRegex.test(message.content) ||
        steamGiftRegex.test(message.content)) &&
      !message.author.bot &&
      !(
        message.member.roles.cache.has(STAFF_ROLE_ID) ||
        message.member.roles.cache.has(TRIAL_SUPPORT_ID) ||
        OWNERS.includes(message.member.id)
      )
    ) {
      try {
        await message.member.timeout(3_600_000, "Advertising");
      } catch (e) {
        await logError("messageDelete", e, client);
      }
    }
  },
};
