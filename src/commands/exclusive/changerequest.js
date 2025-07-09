const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ønsker")
    .setDescription("Fortæl os noget som du godt kunne tænke dig vi gjorde mangler")
    .addStringOption((option) =>
      option
        .setName("request")
        .setDescription("Beskriv hvad du gerne vil havde eller se.")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const request = interaction.options.getString("request");
      const user = interaction.user;
      const channelId = "1392573031959887892"; // Target channel ID

      // Create an embed for the request
      const embed = new EmbedBuilder()
        .setTitle("📢 New Suggestion")
        .setDescription(request)
        .setColor(0xffd700) // Gold color for visibility
        .addFields(
          { name: "Ønsket af", value: `${user.tag}`, inline: true },
          { name: "User ID", value: `${user.id}`, inline: true }
        )
        .setFooter({
          text: "Change Request Submitted",
          iconURL: user.displayAvatarURL(),
        })
        .setTimestamp();

      // Add buttons for marking as done or not done
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("mark_done")
          .setLabel("Marker som gjort")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("mark_not_done")
          .setLabel("Marker som ikke gjort")
          .setStyle(ButtonStyle.Danger)
      );

      // Fetch the target channel and send the embed with the buttons
      const targetChannel = interaction.client.channels.cache.get(channelId);

      if (!targetChannel) {
        await interaction.editReply({
          content:
            "Unable to find the channel to send the change request. Please contact an admin.",
        });
        return;
      }

      await targetChannel.send({ embeds: [embed], components: [row] });

      // Acknowledge the user
      await interaction.editReply({
        content:
          "Your suggestion has been submitted successfully. Thank you for your feedback!",
      });
    } catch (error) {
      console.error("Error handling suggestion:", error);
      await interaction.editReply({
        content:
          "An error occurred while submitting your suggestion. Please try again later.",
      });
    }
  },
};
