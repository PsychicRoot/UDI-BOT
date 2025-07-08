const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription(
      "Displays a list of available commands and their descriptions"
    ),

  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setTitle("📖 Bot Commands Help")
        .setDescription(
          "Here is a list of available commands and what they do:"
        )
        .setColor(0x00aaff)
        .addFields(
          {
            name: "/legalcommodities",
            value:
              "Retrieve prices, maximum SCU, and recommended ships for legal commodities in Star Citizen.",
          },
          {
            name: "/illegalcommodities",
            value:
              "Retrieve prices, maximum SCU, and recommended ships for illegal commodities in Star Citizen.",
          },
          {
            name: "/changelogs",
            value: "Displays the latest changelogs for the bot.",
          },
          {
            name: "/music <command>",
            value: "Well music... duh",
          },
          {
            name: "/suggestion",
            value:
              "Submit a change request for the bot. Requests will be reviewed and responded to by admins.",
          }
        )
        .setFooter({
          text: "Use /help to see this list anytime!",
          iconURL: "https://uexcorp.space/favicon.ico",
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error displaying help command:", error);
      await interaction.reply({
        content:
          "An error occurred while fetching the help information. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
