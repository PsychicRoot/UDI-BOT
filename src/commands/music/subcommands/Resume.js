const { EmbedBuilder } = require("discord.js");
const { MessageFlags } = require("discord-api-types/v10");

module.exports = {
  async resume(client, interaction) {
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

    if (queue.paused) {
      await client.distube.resume(interaction);

      const embed = new EmbedBuilder()
        .setColor(0xa3021f)
        .setDescription(`\`⏯\` | **Song has been:** \`Resumed\``);

      interaction.editReply({ embeds: [embed] });
      client.UpdateQueueMsg(queue);
    } else {
      await client.distube.pause(interaction);

      const embed = new EmbedBuilder()
        .setColor(0xa3021f)
        .setDescription(`\`⏯\` | **Song has been:** \`Paused\``);

      interaction.editReply({ embeds: [embed] });
      client.UpdateQueueMsg(queue);
    }
  },
};
