const { EmbedBuilder } = require("discord.js");
const { logError } = require("../../helpers/logError");
const { COLOR_ATLAS_LEGACY } = require("../../constants/colors");

module.exports = {
  name: "guildMemberAdd",
  async execute(member, client) {
    try {
      const welcomeChannelId = "1388966736367194233";
      const atlasServerId = "1388909264327938169";
      const defaultRoleId = "1388913012961968239";
      const rulesChannelId = "1388915649828622469";

      const atlasServer = await client.guilds.cache.get(atlasServerId);
      await atlasServer.members.fetch();

      // Add the default role to the new member
      await member.roles.add(defaultRoleId);

      const welcomeChannel = await atlasServer.channels.fetch(welcomeChannelId);

      // 👻 Ghost ping the user
      await welcomeChannel.send(`<@${member.id}>`).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 1000);
      });

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
          `Velkommen \`${member.user.username}\` Du er nu trådt ind i United Danes Initiative (UDI) – et dansk fællesskab i Star Citizen, bygget på sammenhold, respekt og ægte rumhygge.\n\nHer samles vikinger af stjernestøv – nogle miner, nogle kæmper, andre handler, eskorterer, udforsker eller bare hænger ud.\n\n👉 Husk at læse <#${rulesChannelId}> for at kende vores fælles spilleregler.`
        )
        .setFooter({ text: `Medlemmer: ${atlasServer.memberCount}` });

      await welcomeChannel.send({ embeds: [welcomeEmbed] });
    } catch (e) {
      await logError("guildMemberAdd", e, client);
    }
  },
};
