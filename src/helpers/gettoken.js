const { getToken } = require("../../helpers/tokenDatabase");

module.exports = {
  async getTokenDeprecated(interaction) {
    try {
      const guildId = interaction.guild.id;
      const token = await getToken(guildId);

      if (!token) {
        await interaction.reply({
          content:
            "No API token is set for this server. Please use the /token command to set one.",
          ephemeral: true,
        });
        return;
      }

      // Use the token for API requests
      const apiUrl = `https://uexcorp.space/api/2.0/commodities_prices?commodity_name=Agricium`;
      const response = await axios.get(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Process the API response as usual...
    } catch (error) {
      console.error("Error retrieving data:", error);
      await interaction.reply({
        content:
          "An error occurred while fetching data. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
