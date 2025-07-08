const { EmbedBuilder } = require("discord.js");
const { MessageFlags } = require("discord-api-types/v10");

module.exports = {
  async join(client, interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const queue = client.distube.getQueue(interaction);
    if (queue)
      return await interaction.editReply(`I already playing in voice channel.`);
    const { channel } = interaction.member.voice;
    if (!channel)
      return await interaction.editReply(`You need to be in voice channel.`);

    await client.distube.voices.join(interaction.member.voice.channel);

    const embed = new EmbedBuilder()
      .setColor(0xa3021f)
      .setDescription(`\`🔊\` | **Joined:** \`${channel.name}\``);

    await interaction.editReply({ embeds: [embed] });
  },
};
