const { SlashCommandBuilder } = require("discord.js");
const { setToken } = require("../../helpers/tokenDatabase");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("token")
    .setDescription("Set the API token for your server")
    .addStringOption((option) =>
      option
        .setName("api_token")
        .setDescription("The API token to set for this server")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      if (!interaction.member.permissions.has("ADMINISTRATOR")) {
        return await interaction.reply({
          content: "You must be an administrator to use this command.",
          ephemeral: true,
        });
      }

      const apiToken = interaction.options.getString("api_token");
      const guildId = interaction.guild.id;

      // Save the token in the database
      await setToken(guildId, apiToken);

      await interaction.reply({
        content: `The API token has been successfully set for this server.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error setting token:", error);
      await interaction.reply({
        content:
          "An error occurred while setting the API token. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
