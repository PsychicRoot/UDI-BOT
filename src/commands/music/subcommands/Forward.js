const { EmbedBuilder } = require("discord.js");
const { MessageFlags } = require("discord-api-types/v10");

module.exports = {
  async forward(client, interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const value = interaction.options.getInteger("seconds");

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

    const song = queue.songs[0];

    if (!value) {
      if (queue.currentTime + 10 < song.duration) {
        await queue.seek(queue.currentTime + 10);

        const embed = new EmbedBuilder()
          .setDescription(
            `\`⏭\` | *Forward to:* \`${queue.formattedCurrentTime}\``
          )
          .setColor(0xa3021f);

        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply(
          `Cannot forward beyond the song's duration.`
        );
      }
    } else if (queue.currentTime + value < song.duration) {
      await queue.seek(queue.currentTime + value);

      const embed = new EmbedBuilder()
        .setDescription(
          `\`⏭\` | *Forward to:* \`${queue.formattedCurrentTime}\``
        )
        .setColor(0xa3021f);

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply(`Cannot forward beyond the song's duration.`);
    }
  },
};
