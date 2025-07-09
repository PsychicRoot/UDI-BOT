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
        .setTitle("🪐 United Danes Initiative – Velkommen ombord, Pilot!")
        .setURL("https://robertsspaceindustries.com/en/orgs/UNITDANES")
        .setThumbnail(
          "https://robertsspaceindustries.com/media/fp4h0bym118mxr/logo/UNITDANES-Logo.png"
        )
        .setAuthor({
          name: member.user.globalName,
          iconURL: member.user.displayAvatarURL(),
        })
        .setDescription(
          `🛸 **Velkommen til _United Danes Initiative (UDI)_ – et dansk fællesskab i Star Citizen!**\n\n` +
          `Pilot \`${member.user.username}\`, du er nu en del af en organisation bygget på **sammenhold, respekt** og ægte **rumhygge**.\n\n` +
          `🌌 Hos UDI finder du stjernestøvsdækkede vikinger der miner, kæmper, handler, eskorterer, udforsker – eller bare nyder udsigten fra cockpittet.\n\n` +
          `📜 **Regler & Retningslinjer:** Husk at læse <#${rulesChannelId}> for at sikre et godt rumklima for alle medlemmer.\n\n` +
          `💬 **Feedback eller idéer?** Brug \`/ønsker\` for at indsende dine tanker – vi værdsætter alles input i vores fælles rejse gennem ’verse.\n\n` +
          `🛰️ _Vi ses i Stanton, Pyro eller hvor end stjernene fører os!_`
        )
        .setFooter({ text: `👥 Medlemmer ombord: ${atlasServer.memberCount}` });

      await welcomeChannel.send({ embeds: [welcomeEmbed] });
    } catch (e) {
      await logError("guildMemberAdd", e, client);
    }
  },
};
