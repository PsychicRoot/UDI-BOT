const { EmbedBuilder } = require("discord.js");
const { logError } = require("../../helpers/logError");
const { COLOR_ATLAS_LEGACY } = require("../../constants/colors");

module.exports = {
  name: "guildMemberAdd",
  async execute(member, client) {
    try {
      const welcomeChannelId = "1388966736367194233";
      const atlasServerId = "1388909264327938169";

      const atlasServer = await client.guilds.cache.get(atlasServerId);
      await atlasServer.members.fetch();

      const welcomeChannel = await atlasServer.channels.fetch(welcomeChannelId);

      const welcomeEmbed = new EmbedBuilder()
        .setColor(COLOR_ATLAS_LEGACY)
        .setTitle("United Danes Initiative")
        .setURL("https://robertsspaceindustries.com/en/orgs/UNITDANES")
        .setThumbnail(
          "https://robertsspaceindustries.com/media/fp4h0bym118mxr/logo/UNITDANES-Logo.png"
        )
        .setAuthor({
          name: `${member.user.globalName}`,
          iconURL: `${member.user.displayAvatarURL()}`,
        })
        .setDescription(
          `Velkommen \`${member.user.username}\` til UDI. Vi håber du får det godt ved os.`
        )
        .setFooter({ text: `Total Members: ${atlasServer.memberCount}` });

      await welcomeChannel.send({ embeds: [welcomeEmbed] });
    } catch (e) {
      await logError("guildMemberAdd", e, client);
    }
  },
};
