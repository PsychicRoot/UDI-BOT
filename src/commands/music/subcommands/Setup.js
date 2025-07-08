const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { MessageFlags } = require("discord-api-types/v10");

module.exports = {
  async setup(client, interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    )
      return await interaction.editReply(`You don't have permission.`);

    await interaction.guild.channels
      .create({
        name: "song-request",
        type: 0,
        topic: `⏯ *Pause/Resume the song.*\n⬅ *Previous the song.*\n⏹ *Stop the song.*\n➡ *Skip the song.*\n🔁 *Loop/Unloop the song.*`,
        parent_id: interaction.channel.parentId,
        user_limit: 3,
        rate_limit_per_user: 3,
      })
      .then(async (channel) => {
        const content = `**__Queue list:__**\nJoin a voice channel and queue songs by name or url in here.`;

        const embed = new EmbedBuilder()
          .setColor(0xa3021f)
          .setAuthor({ name: `No song playing currently.` })
          .setImage(
            `https://images2.alphacoders.com/110/thumb-1920-1109233.jpg`
          )
          .setDescription("_ _")
          .setFooter({ text: `Prefix is: /` });

        await channel
          .send({
            content: `${content}`,
            embeds: [embed],
            components: [client.diSwitch, client.diSwitch2],
          })
          .then(async (message) => {
            // Create database!
            await client.createSetup(interaction, channel.id, message.id); // Can find on handlers/loadDatabase.js

            const embed = new EmbedBuilder()
              .setDescription(`*Succesfully Setup Music System in* ${channel}`)
              .setColor(0xa3021f);

            return await interaction.followUp({ embeds: [embed] });
          });
      });
  },
};
