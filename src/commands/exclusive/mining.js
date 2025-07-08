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
    .setDescription("Få omfattende minedrift- og raffineringsinformation")
    .addStringOption((option) => {
      const choices = Object.keys(miningData).map((c) => ({ name: c, value: c }));
      return option
        .setName("commodity")
        .setDescription("Vælg handelsvaren")
        .setRequired(true)
        .addChoices(...choices);
    })
    .addIntegerOption((option) =>
      option
        .setName("scu")
        .setDescription("SCU-mængde til beregning af raffinering (valgfrit)")
        .setMinValue(1)
    )
    .setContexts([GUILD]),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const guildId = interaction.guild.id;
      const token = await getToken(guildId).catch((error) => {
        console.error("Fejl i token-database:", error);
        throw new Error("Kunne ikke hente API-token fra databasen");
      });

      if (!token) {
        await interaction.editReply({
          content:
            "❌ Ingen API-token er konfigureret. Brug `/token <din_token>` for at indstille én.",
          ephemeral: true,
        });
        return;
      }

      const commodity = interaction.options.getString("commodity");
      const scuAmount = interaction.options.getInteger("scu");
      const miningInfo = miningData[commodity];

      if (!miningInfo) {
        await interaction.editReply({
          content: "❌ Ugyldig handelsvare valgt.",
          ephemeral: true,
        });
        return;
      }

      const { miningMethod, refinery, yield: refineYield, note } = miningInfo;

      const apiUrl = `https://api.uexcorp.space/2.0/commodities_prices?commodity_name=${encodeURIComponent(
        commodity
      )}`;
      const data = await fetchWithFallback(apiUrl, token).catch((error) => {
        if (error.response) {
          console.error("API-fejl:", error.response.status, error.response.data);
          if (error.response.status === 403) {
            throw new Error("Ugyldig API-token. Opdater venligst med `/token`.");
          } else if (error.response.status === 404) {
            throw new Error("Handelsvaredata ikke fundet.");
          } else {
            throw new Error(`API svarede med ${error.response.status}`);
          }
        } else if (error.request) {
          console.error("Ingen svar modtaget:", error.request);
          throw new Error("Ingen respons fra API-serveren.");
        } else {
          console.error("Fejl ved opsætning af forespørgsel:", error.message);
          throw new Error("Kunne ikke opsætte API-forespørgsel.");
        }
      });

      if (data?.status === "access_denied") {
        await interaction.editReply({
          content:
            "❌ Ugyldig API-token. Opdater venligst med `/token <ny_token>`.",
          ephemeral: true,
        });
        return;
      }

      if (!data?.data?.length) {
        await interaction.editReply({
          content: `❌ Ingen markedsdata tilgængelig for ${commodity}.`,
          ephemeral: true,
        });
        return;
      }

      const bestSell = data.data.reduce(
        (best, entry) =>
          entry.price_sell > (best?.price || 0)
            ? {
                price: entry.price_sell,
                location: `${entry.terminal_name || "Terminal"} i ${
                  entry.city_name ||
                  entry.planet_name ||
                  entry.star_system_name ||
                  "Ukendt"
                }`,
              }
            : best,
        null
      );

      const embed = new EmbedBuilder()
        .setTitle(`⛏️ ${commodity} minedriftsrapport`)
        .setColor(0x2ecc71)
        .addFields(
          { name: "━━━━━━━━━  KERNEDATA  ━━━━━━━━━", value: "\u200B" },
          {
            name: "Anbefalet minedrift",
            value: `\`\`\`fix\n${miningMethod}\`\`\``,
            inline: true,
          },
          {
            name: "Raffineringsproces",
            value: `\`\`\`fix\n${refinery}\`\`\``,
            inline: true,
          },
          {
            name: "Udbytteeffektivitet",
            value: `\`\`\`fix\n${(refineYield * 100).toFixed(0)}%\`\`\``,
            inline: true,
          }
        );

      if (bestSell) {
        embed.addFields(
          { name: "━━━━━━━━━  MARKEDSDATA  ━━━━━━━━━", value: "\u200B" },
          {
            name: "Bedste salgspris",
            value: `\`\`\`diff\n+ ${bestSell.price.toLocaleString()} aUEC\`\`\``,
            inline: true,
          },
          {
            name: "Salgssted",
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
            name: "━━━━━━━━━  RAFFINERINGSBEREGNER  ━━━━━━━━━",
            value: "\u200B",
          },
          {
            name: "Råmateriale",
            value: `\`\`\`${scuAmount.toLocaleString()} SCU\`\`\``,
            inline: true,
          },
          {
            name: "Efter raffinering",
            value: `\`\`\`diff\n+ ${refinedSCU.toLocaleString()} SCU\`\`\``,
            inline: true,
          },
          {
            name: "Materialetab",
            value: `\`\`\`diff\n- ${lostSCU.toLocaleString()} SCU\`\`\``,
            inline: true,
          },
          {
            name: "Estimeret værdi",
            value: `\`\`\`diff\n+ ${estimatedValue} aUEC\`\`\``,
            inline: true,
          }
        );
      }

      embed.addFields(
        { name: "━━━━━━━━━  BEMÆRKNINGER  ━━━━━━━━━", value: "\u200B" },
        { name: "Særlige overvejelser", value: `\`\`\`${note}\`\`\`` }
      );

      embed
        .setFooter({
          text: "UEX API | PsychicRoot",
          iconURL: "https://uexcorp.space/favicon.ico",
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Fejl i /mining-kommandoen:", error);
      await interaction.editReply({
        content: `❌ Fejl: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
