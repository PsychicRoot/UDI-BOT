const { EmbedBuilder } = require("discord.js");
const { MessageFlags } = require("discord-api-types/v10");

module.exports = {
  async loopQueue(client, interaction) {
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

    if (queue.repeatMode === 2) {
      await client.distube.setRepeatMode(interaction, 0);

      const embed = new EmbedBuilder()
        .setColor(0xa3021f)
        .setDescription(`\`🔁\` | **Song is unloop:** \`All\``);

      await interaction.editReply({ embeds: [embed] });
    } else {
      await client.distube.setRepeatMode(interaction, 2);

      const embed = new EmbedBuilder()
        .setColor(0xa3021f)
        .setDescription(`\`🔁\` | **Song is loop:** \`All\``);

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
