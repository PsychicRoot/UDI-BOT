const { EmbedBuilder } = require("discord.js");
const { MessageFlags } = require("discord-api-types/v10");

module.exports = {
  async clearQueue(client, interaction) {
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

    await queue.songs.splice(1, queue.songs.length);
    await client.UpdateQueueMsg(queue);

    const embed = new EmbedBuilder()
      .setDescription(`\`📛\` | *Queue has been:* \`Cleared\``)
      .setColor(0xa3021f);

    await interaction.editReply({ embeds: [embed] });
  },
};
