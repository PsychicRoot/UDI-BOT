const { EmbedBuilder } = require("discord.js");
const { MessageFlags } = require("discord-api-types/v10");

module.exports = {
  async volume(client, interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const volume = interaction.options.getInteger("amount");

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

    if (!volume) {
      const embed = new EmbedBuilder()
        .setColor(0xa3021f)
        .setDescription(`Current **volume** : \`${queue.volume}\`%`);

      return await interaction.editReply({ embeds: [embed] });
    }

    if (volume < 1 || volume > 100)
      return await interaction.editReply(
        `Please provide a number between 1 and 100`
      );

    await client.distube.setVolume(interaction, volume);

    const embed = new EmbedBuilder()
      .setColor(0xa3021f)
      .setDescription(`\`🔊\` | **Change volume to:** \`${volume}\`%`);

    interaction.editReply({ embeds: [embed] });
  },
};
