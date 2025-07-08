// commands/tools/changelogs.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAllChangelogChannels } = require("../../helpers/changelogDatabase");

const OWNER_ID = "215738013597040640";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("changelogs")
    .setDescription("Posts the latest changelog to all registered channels"),

  async execute(interaction) {
    // Restrict command usage to the bot owner
    if (interaction.user.id !== OWNER_ID) {
      return await interaction.reply({
        content: "❌ You are not authorized to use this command.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      // IDs of your source server + channel
      const SOURCE_GUILD = "1310403578862501918";
      const SOURCE_CHANNEL = "1310403621686345850";

      // fetch the source message
      const srcGuild = await interaction.client.guilds.fetch(SOURCE_GUILD);
      const srcChannel = await srcGuild.channels.fetch(SOURCE_CHANNEL);
      const fetched = await srcChannel.messages.fetch({ limit: 1 });
      if (!fetched.size) {
        return await interaction.editReply(
          "⚠️ No changelog messages found in source channel."
        );
      }

      const latest = fetched.first();
      const embed = new EmbedBuilder()
        .setTitle(":scroll: Latest Changelog")
        .setDescription(latest.content)
        .setColor(0x00ff00)
        .setTimestamp(latest.createdAt)
        .setFooter({
          text: `Posted by ${latest.author.tag}`,
          iconURL: latest.author.displayAvatarURL({ dynamic: true }),
        });

      // broadcast
      const channelsMap = await getAllChangelogChannels();
      let success = 0,
        failure = 0;

      for (const [guildId, channelId] of Object.entries(channelsMap)) {
        try {
          const guild = await interaction.client.guilds.fetch(guildId);
          const channel = await guild.channels.fetch(channelId);
          if (channel && channel.isTextBased()) {
            await channel.send({ embeds: [embed] });
            success++;
          } else {
            failure++;
          }
        } catch (e) {
          console.warn(`Failed to send to ${guildId}/${channelId}:`, e.message);
          failure++;
        }
      }

      await interaction.editReply(
        `✅ Changelog sent to ${success} server(s).` +
          (failure ? ` ❌ Failed on ${failure}.` : "")
      );
    } catch (error) {
      console.error("Error posting changelogs:", error);
      await interaction.editReply(
        "❌ An error occurred while broadcasting changelogs."
      );
    }
  },
};
