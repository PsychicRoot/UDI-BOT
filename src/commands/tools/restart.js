const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");
const { GUILD } = require("../../constants/interactionTypes");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Restarts the bot")
    .setContexts([GUILD]),

  async execute(interaction, client) {
    await interaction.deferReply();

    // Your Discord user ID
    const developerId = "215738013597040640";

    // Check if the user is authorized
    if (interaction.user.id !== developerId) {
      await interaction.editReply({
        content: "🚫 The restart command is limited to the developer.",
        ephemeral: true, // Makes the reply visible only to the user
      });
      return;
    }

    const restartUrl = "https://bot.hoboutilities.cc";

    try {
      // Trigger the restart
      await interaction.editReply({
        content: "Exiting star system...",
      });

      // Make the request to the restart endpoint
      await axios.get(restartUrl);
    } catch (error) {
      console.error("Error triggering bot restart:", error);

      // Inform the developer if the restart fails
      await interaction.editReply({
        content: "❌ An error occurred while attempting to restart the bot.",
      });
    }
  },
};
