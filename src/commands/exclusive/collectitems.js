const { SlashCommandBuilder } = require("discord.js");
const { getToken } = require("../../helpers/tokenDatabase");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const CACHE_FILE = path.join(__dirname, "../../helpers/items_cache.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("collectitems")
    .setDescription("Fetches and stores all item data for quick access."),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const serverId = interaction.guildId;
      const serverToken = await getToken(serverId);

      if (!serverToken) {
        await interaction.editReply({
          content: "No API token set for this server.",
          ephemeral: true,
        });
        return;
      }

      const apiUrl = "https://api.uexcorp.space/2.0/items_prices_all";
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${serverToken}` },
      });

      const items = response.data.data;
      if (!items || items.length === 0) {
        await interaction.editReply({
          content: "No items found in the API response.",
          ephemeral: true,
        });
        return;
      }

      // Save fetched items to cache file
      fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2));

      await interaction.editReply({
        content: `✅ Successfully stored ${items.length} items for quick search.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error in /collectitems:", error);
      await interaction.editReply({
        content: "❌ Failed to fetch and store item data. Try again later.",
        ephemeral: true,
      });
    }
  },
};
