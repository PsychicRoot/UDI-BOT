const { EmbedBuilder } = require("discord.js");
const { MessageFlags } = require("discord-api-types/v10");

module.exports = {
  async previous(client, interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = client.distube.getQueue(interaction);
    if (!queue)
      return await interaction.editReply(
        `There is nothing in the queue right now!`
      );
    const { channel } = interaction.member.voice;
    if (
      !channel ||
      interaction.member.voice.channel !==
        interaction.guild.members.me.voice.channel
    )
      return await interaction.editReply(
        "You need to be in a same/voice channel."
      );

    if (queue.previousSongs.length == 0) {
      const embed = new EmbedBuilder()
        .setColor(0xa3021f)
        .setDescription("`🚨` | **There are no** `Previous` **songs**");

      interaction.editReply({ embeds: [embed] });
    } else {
      await client.distube.previous(interaction);

      const embed = new EmbedBuilder()
        .setColor(0xa3021f)
        .setDescription("`⏮` | **Song has been:** `Previous`");

      interaction.editReply({ embeds: [embed] });
    }
  },
};
