const { EmbedBuilder } = require("discord.js");
const { MessageFlags } = require("discord-api-types/v10");

module.exports = {
  async move(client, interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const tracks = interaction.options.getInteger("queue");
    const position = interaction.options.getInteger("position");

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
      return await interaction.editReply(`Cannot move a song already playing.`);
    if (position === 0)
      return await interaction.editReply(
        `Cannot move to this position a song already playing.`
      );
    if (tracks > queue.songs.length)
      return await interaction.editReply(`Queue | Song not found.`);
    if (position > queue.songs.length)
      return await interaction.editReply(`Position | Song not found.`);

    const song = queue.songs[tracks];

    await queue.songs.splice(tracks);
    await queue.addToQueue(song, position);

    const embed = new EmbedBuilder()
      .setDescription(`**Moved • [${song.name}](${song.url})** to ${position}`)
      .setColor(0xa3021f);

    interaction.editReply({ embeds: [embed] });
  },
};
