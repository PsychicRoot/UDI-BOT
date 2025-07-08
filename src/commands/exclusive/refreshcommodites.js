const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { getToken } = require("../../helpers/tokenDatabase");
const { fetchWithFallback } = require("../../helpers/fetchWithFallback");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("refreshcommodities")
    .setDescription(
      "Fetch and save legal/illegal commodities with available systems from UEX API"
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guild.id;
      const token = await getToken(guildId);

      if (!token) {
        await interaction.editReply(
          "❌ No API token configured. Use `/token <your_token>` to set one."
        );
        return;
      }

      const listUrl = "https://api.uexcorp.space/2.0/commodities";
      const listResponse = await fetchWithFallback(listUrl, token);

      if (!listResponse?.data || !Array.isArray(listResponse.data)) {
        throw new Error("Invalid response from commodities list endpoint");
      }

      const legal = {};
      const illegal = {};

      for (const commodity of listResponse.data) {
        const name = commodity?.name;
        const isIllegal = commodity?.is_illegal === 1;

        if (!name || commodity?.is_available_live !== 1) continue;

        const encodedName = encodeURIComponent(name);
        const systemUrl = `https://api.uexcorp.space/2.0/commodities_prices?commodity_name=${encodedName}`;

        await delay(250);

        let systemData;
        try {
          const response = await fetchWithFallback(systemUrl, token);
          systemData = response?.data;
        } catch (e) {
          console.warn(
            `⚠️ Skipping ${name}, failed to fetch data: ${e.message}`
          );
          continue;
        }

        if (!Array.isArray(systemData) || systemData.length === 0) {
          console.warn(`⚠️ No system entries for ${name}`);
          continue;
        }

        const systems = new Set();

        for (const entry of systemData) {
          if (
            typeof entry.star_system_name === "string" &&
            entry.commodity_name === name
          ) {
            systems.add(entry.star_system_name);
          }
        }

        if (systems.size === 0) continue;

        if (isIllegal) {
          illegal[name] = Array.from(systems).sort();
        } else {
          legal[name] = Array.from(systems).sort();
        }
      }

      const output = {
        legalCommodities: Object.keys(legal).length > 0 ? legal : {},
        illegalCommodities: Object.keys(illegal).length > 0 ? illegal : {},
      };

      const filePath = path.join(__dirname, "../../data/commodities.json");
      fs.writeFileSync(filePath, JSON.stringify(output, null, 2));

      await interaction.editReply(
        `✅ Saved ${Object.keys(legal).length} legal and ${
          Object.keys(illegal).length
        } illegal commodities with system data.`
      );
    } catch (error) {
      console.error("Error refreshing commodity list:", error);
      await interaction.editReply("❌ Failed to refresh commodity list.");
    }
  },
};
