const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const CACHE_FILE = path.join(__dirname, "../../helpers/items_cache.json");
const API_URL = "https://api.uexcorp.space/2.0/terminals";

// 🔹 Function to calculate Levenshtein Distance
function getLevenshteinDistance(a, b) {
  if (!a || !b) return Infinity;
  const matrix = [];

  let i, j;
  for (i = 0; i <= b.length; i++) matrix[i] = [i];
  for (j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("finditem")
    .setDescription("Search for an item and get the cheapest buy location")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Enter the item name to search for")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const searchQuery = interaction.options.getString("name").toLowerCase();

      // 🔹 Check if the cache file exists
      if (!fs.existsSync(CACHE_FILE)) {
        await interaction.editReply({
          content: "⚠️ No item data found. Please run `/collectitems` first.",
          ephemeral: true,
        });
        return;
      }

      const rawData = fs.readFileSync(CACHE_FILE);
      const items = JSON.parse(rawData);

      // 🔹 Find closest matching item using Levenshtein Distance
      let bestMatch = null;
      let bestDistance = Infinity;

      items.forEach((item) => {
        if (item.item_name) {
          const distance = getLevenshteinDistance(
            searchQuery,
            item.item_name.toLowerCase()
          );
          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = item;
          }
        }
      });

      if (!bestMatch) {
        await interaction.editReply({
          content: `❌ No results found for "${searchQuery}".`,
          ephemeral: true,
        });
        return;
      }

      // 🔹 Find the cheapest buy location
      const matchingItems = items.filter(
        (item) => item.item_name === bestMatch.item_name && item.price_buy
      );
      if (matchingItems.length === 0) {
        await interaction.editReply({
          content: `❌ No buy locations found for **${bestMatch.item_name}**.`,
          ephemeral: true,
        });
        return;
      }

      const cheapestBuy = matchingItems.reduce((min, item) =>
        item.price_buy < min.price_buy ? item : min
      );
      const terminalName = cheapestBuy.terminal_name || "Unknown";

      // 🔹 Fetch Star System using UEX API (Correct Endpoint)
      let starSystem = "Unknown";
      try {
        const response = await axios.get(API_URL);
        const terminalData = response.data.data.find(
          (term) => term.terminal_name === terminalName
        );
        if (terminalData) {
          starSystem = terminalData.star_system_name || "Unknown";
        }
      } catch (apiError) {
        console.error("⚠️ UEX API Error:", apiError);
      }

      // 🔹 Send the embed response
      const embed = new EmbedBuilder()
        .setTitle(`🔍 ${bestMatch.item_name} Information`)
        .setColor(0x007bff)
        .addFields(
          {
            name: "📍 Cheapest Buy Location",
            value: terminalName,
            inline: false,
          },
          {
            name: "💰 Cheapest Buy Price",
            value: `${cheapestBuy.price_buy} aUEC`,
            inline: true,
          }
        )
        .setFooter({ text: "Data from local cache & UEX API" });

      await interaction.editReply({
        content: `🔍 Closest match found for **"${searchQuery}"**:`,
        embeds: [embed],
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error in /finditem:", error);
      await interaction.editReply({
        content: "❌ Failed to retrieve item data. Try again later.",
        ephemeral: true,
      });
    }
  },
};
