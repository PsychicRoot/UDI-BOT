const { EmbedBuilder } = require("discord.js");
const { MessageFlags } = require("discord-api-types/v10");

module.exports = {
  async remove(client, interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const tracks = interaction.options.getInteger("position");

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

    if (tracks === 0)
      return await interaction.editReply(
        `Cannot remove a song already playing.`
      );
    if (tracks > queue.songs.length)
      return await interaction.editReply(`Song not found.`);

    const song = queue.songs[tracks];

    await queue.songs.splice(tracks, 1);

    const embed = new EmbedBuilder()
      .setColor(0xa3021f)
      .setDescription(
        `**Removed • [${song.name}](${song.url})** \`${song.formattedDuration}\` • ${song.user}`
      );

    interaction.editReply({ content: " ", embeds: [embed] });
  },
};
