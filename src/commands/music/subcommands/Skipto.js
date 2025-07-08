const { EmbedBuilder } = require("discord.js");
const { MessageFlags } = require("discord-api-types/v10");

module.exports = {
  async skipTo(client, interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const args = interaction.options.getInteger("position");

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

    if (args > queue.songs.length || (args && !queue.songs[args]))
      return await interaction.editReply("Song not found.");

    await client.distube.jump(interaction, args);

    const embed = new EmbedBuilder()
      .setColor(0xa3021f)
      .setDescription(`\`⏭\` | **Skipto:** ${args}`);

    interaction.editReply({ embeds: [embed] });
  },
};
