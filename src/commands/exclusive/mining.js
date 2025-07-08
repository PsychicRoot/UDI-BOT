const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { fetchWithFallback } = require("../../helpers/fetchWithFallback");
const { getToken } = require("../../helpers/tokenDatabase");
const { GUILD } = require("../../constants/interactionTypes");

const miningData = {
  Quantainum: {
    miningMethod: "Laser Mining",
    refinery: "Dynex Solventation",
    yield: 0.85,
    note: "Highly volatile - requires quick transport",
  },
  Laranite: {
    miningMethod: "Surface Mining",
    refinery: "Thermonic Smelting",
    yield: 0.9,
    note: "Found in asteroid clusters",
  },
  Titanium: {
    miningMethod: "Scraping",
    refinery: "Pyrolytic Decanting",
    yield: 0.8,
    note: "Abundant in planetary rings",
  },
  Gold: {
    miningMethod: "Subsurface Mining",
    refinery: "Thermonic Smelting",
    yield: 0.88,
    note: "Best found in asteroid fields",
  },
  Diamond: {
    miningMethod: "Laser Mining",
    refinery: "Dynex Solventation",
    yield: 0.82,
    note: "Requires precise laser control",
  },
  Bexalite: {
    miningMethod: "Laser Mining",
    refinery: "Quantum Refinement",
    yield: 0.87,
    note: "Found in deep core asteroids",
  },
  Taranite: {
    miningMethod: "Subsurface Mining",
    refinery: "Quantum Refinement",
    yield: 0.83,
    note: "High-value but rare",
  },
  Aluminum: {
    miningMethod: "Surface Mining",
    refinery: "Pyrolytic Decanting",
    yield: 0.91,
    note: "Common but consistent profits",
  },
  Copper: {
    miningMethod: "Surface Mining",
    refinery: "Thermonic Smelting",
    yield: 0.89,
    note: "Good for beginners",
  },
  Agricium: {
    miningMethod: "Laser Mining",
    refinery: "Quantum Refinement",
    yield: 0.84,
    note: "Agricultural applications increase value",
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mining")
    .setDescription("Get comprehensive mining and refining information")
    .addStringOption((option) => {
      const choices = Object.keys(miningData).map((c) => ({
        name: c,
        value: c,
      }));
      return option
        .setName("commodity")
        .setDescription("Select mining commodity")
        .setRequired(true)
        .addChoices(...choices);
    })
    .addIntegerOption((option) =>
      option
        .setName("scu")
        .setDescription("SCU amount to calculate refining (optional)")
        .setMinValue(1)
    )
    .setContexts([GUILD]),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      // Get token with proper error handling
      const guildId = interaction.guild.id;
      const token = await getToken(guildId).catch((error) => {
        console.error("Token database error:", error);
        throw new Error("Failed to retrieve API token from database");
      });

      if (!token) {
        await interaction.editReply({
          content:
            "❌ No API token configured. Please use `/token <your_token>` to set one.",
          ephemeral: true,
        });
        return;
      }

      const commodity = interaction.options.getString("commodity");
      const scuAmount = interaction.options.getInteger("scu");
      const miningInfo = miningData[commodity];

      if (!miningInfo) {
        await interaction.editReply({
          content: "❌ Invalid commodity selected",
          ephemeral: true,
        });
        return;
      }

      const { miningMethod, refinery, yield: refineYield, note } = miningInfo;

      // API call with proper error handling
      const apiUrl = `https://api.uexcorp.space/2.0/commodities_prices?commodity_name=${encodeURIComponent(
        commodity
      )}`;
      const data = await fetchWithFallback(apiUrl, token).catch((error) => {
        if (error.response) {
          console.error(
            "API Error:",
            error.response.status,
            error.response.data
          );
          if (error.response.status === 403) {
            throw new Error("Invalid API token. Please update using `/token`.");
          } else if (error.response.status === 404) {
            throw new Error("Commodity data not found");
          } else {
            throw new Error(`API responded with ${error.response.status}`);
          }
        } else if (error.request) {
          console.error("No response received:", error.request);
          throw new Error("No response from API server");
        } else {
          console.error("Request setup error:", error.message);
          throw new Error("Failed to setup API request");
        }
      });

      // Handle API response errors
      if (data?.status === "access_denied") {
        await interaction.editReply({
          content:
            "❌ Invalid API token. Please update using `/token <new_token>`.",
          ephemeral: true,
        });
        return;
      }

      if (!data?.data?.length) {
        await interaction.editReply({
          content: `❌ No market data available for ${commodity}`,
          ephemeral: true,
        });
        return;
      }

      // Process data
      const bestSell = data.data.reduce(
        (best, entry) =>
          entry.price_sell > (best?.price || 0)
            ? {
                price: entry.price_sell,
                location: `${entry.terminal_name || "Terminal"} in ${
                  entry.city_name ||
                  entry.planet_name ||
                  entry.star_system_name ||
                  "Unknown"
                }`,
              }
            : best,
        null
      );

      // Build embed
      const embed = new EmbedBuilder()
        .setTitle(`⛏️ ${commodity} Mining Report`)
        .setColor(0x2ecc71)
        .addFields(
          { name: "━━━━━━━━━  CORE DATA  ━━━━━━━━━", value: "\u200B" },
          {
            name: "Recommended Mining",
            value: `\`\`\`fix\n${miningMethod}\`\`\``,
            inline: true,
          },
          {
            name: "Refinery Process",
            value: `\`\`\`fix\n${refinery}\`\`\``,
            inline: true,
          },
          {
            name: "Yield Efficiency",
            value: `\`\`\`fix\n${(refineYield * 100).toFixed(0)}%\`\`\``,
            inline: true,
          }
        );

      if (bestSell) {
        embed.addFields(
          { name: "━━━━━━━━━  MARKET DATA  ━━━━━━━━━", value: "\u200B" },
          {
            name: "Best Sell Price",
            value: `\`\`\`diff\n+ ${bestSell.price.toLocaleString()} aUEC\`\`\``,
            inline: true,
          },
          {
            name: "Sell Location",
            value: `\`\`\`${bestSell.location}\`\`\``,
            inline: true,
          }
        );
      }

      if (scuAmount) {
        const refinedSCU = Math.floor(scuAmount * refineYield);
        const lostSCU = scuAmount - refinedSCU;
        const estimatedValue = bestSell
          ? (refinedSCU * bestSell.price).toLocaleString()
          : "N/A";

        embed.addFields(
          {
            name: "━━━━━━━━━  REFINING CALCULATOR  ━━━━━━━━━",
            value: "\u200B",
          },
          {
            name: "Raw Material",
            value: `\`\`\`${scuAmount.toLocaleString()} SCU\`\`\``,
            inline: true,
          },
          {
            name: "After Refining",
            value: `\`\`\`diff\n+ ${refinedSCU.toLocaleString()} SCU\`\`\``,
            inline: true,
          },
          {
            name: "Material Loss",
            value: `\`\`\`diff\n- ${lostSCU.toLocaleString()} SCU\`\`\``,
            inline: true,
          },
          {
            name: "Estimated Value",
            value: `\`\`\`diff\n+ ${estimatedValue} aUEC\`\`\``,
            inline: true,
          }
        );
      }

      embed.addFields(
        { name: "━━━━━━━━━  NOTES  ━━━━━━━━━", value: "\u200B" },
        { name: "Special Considerations", value: `\`\`\`${note}\`\`\`` }
      );

      embed
        .setFooter({
          text: "UEX API | PsychicRoot",
          iconURL: "https://uexcorp.space/favicon.ico",
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Mining command error:", error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
