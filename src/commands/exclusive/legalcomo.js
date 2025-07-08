const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const { fetchWithFallback } = require("../../helpers/fetchWithFallback");
const { getToken } = require("../../helpers/tokenDatabase");
const fs = require("fs");
const path = require("path");

const ships = [
  { name: "Avenger Titan", scu: 8 },
  { name: "Cutlass Black", scu: 46 },
  { name: "Freelancer", scu: 66 },
  { name: "Freelancer MAX", scu: 120 },
  { name: "Constellation Taurus", scu: 174 },
  { name: "Mercury Star Runner", scu: 114 },
  { name: "Caterpillar", scu: 576 },
  { name: "C2 Hercules", scu: 696 },
  { name: "M2 Hercules", scu: 522 },
  { name: "Carrack", scu: 456 },
  { name: "Hull C", scu: 4608 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("legalcommodities")
    .setDescription(
      "Retrieve prices and profit calculations for legal commodities"
    )
    .addStringOption((option) =>
      option
        .setName("system")
        .setDescription("Select a star system")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("commodity_name")
        .setDescription("Select a legal commodity")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("input_type")
        .setDescription("Choose input type for calculations")
        .addChoices(
          { name: "SCU Amount", value: "scu" },
          { name: "aUEC Amount", value: "auec" }
        )
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of SCU or aUEC to calculate")
        .setMinValue(1)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const focusedOption = interaction.options.getFocused(true).name;
    const filePath = path.join(__dirname, "../../data/commodities.json");

    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(raw);

      if (focusedOption === "system") {
        const systemsSet = new Set();
        for (const systems of Object.values(data.legalCommodities || {})) {
          systems.forEach((s) => systemsSet.add(s));
        }
        const systems = Array.from(systemsSet).filter((s) =>
          s.toLowerCase().includes(focused.toLowerCase())
        );
        return await interaction.respond(
          systems.slice(0, 25).map((name) => ({ name, value: name }))
        );
      }

      if (focusedOption === "commodity_name") {
        const system = interaction.options.getString("system");
        if (!system) return await interaction.respond([]);
        const filtered = Object.entries(data.legalCommodities || {})
          .filter(([, systems]) => systems.includes(system))
          .map(([name]) => name)
          .filter((name) => name.toLowerCase().includes(focused.toLowerCase()))
          .slice(0, 25);
        return await interaction.respond(
          filtered.map((name) => ({ name, value: name }))
        );
      }

      return await interaction.respond([]);
    } catch (err) {
      console.error("❌ Autocomplete error:", err);
      return await interaction.respond([]);
    }
  },

  async execute(interaction) {
    await interaction.deferReply();
    const systemName = interaction.options.getString("system");
    const commodityName = interaction.options.getString("commodity_name");
    const inputType = interaction.options.getString("input_type");
    const amount = interaction.options.getInteger("amount");

    const guildId = interaction.guild.id;
    const token = await getToken(guildId);

    if (!token) {
      return await interaction.editReply({
        content:
          "❌ No API token configured. Please use `/token <your_token>` to set one.",
        ephemeral: true,
      });
    }

    const apiUrl = `https://api.uexcorp.space/2.0/commodities_prices?commodity_name=${encodeURIComponent(
      commodityName
    )}`;

    let data;
    try {
      const response = await fetchWithFallback(apiUrl, token);
      if (!response?.data) throw new Error("Invalid API response structure");
      data = response.data;
    } catch (error) {
      console.error("API fetch error:", error);
      return await interaction.editReply({
        content: "❌ Failed to fetch commodity data from UEX API.",
        ephemeral: true,
      });
    }

    const formatLocation = (entry) => {
      const parts = [];
      if (entry.terminal_name) parts.push(entry.terminal_name);
      if (entry.city_name) parts.push(entry.city_name);
      if (entry.planet_name) parts.push(entry.planet_name);
      if (entry.star_system_name) parts.push(entry.star_system_name);
      return parts.length ? parts.join(" @ ") : "Unknown Location";
    };

    const systemData = data.filter(
      (entry) =>
        entry.star_system_name
          ?.toLowerCase()
          .includes(systemName.toLowerCase()) &&
        entry.commodity_name?.toLowerCase() === commodityName.toLowerCase() &&
        (entry.price_buy || entry.price_sell)
    );

    if (!systemData.length) {
      return await interaction.editReply({
        content: `❌ No valid price data found for ${commodityName} in ${systemName}.`,
        ephemeral: true,
      });
    }

    const buyLocations = systemData
      .filter((entry) => entry.price_buy)
      .map((entry) => ({
        price: entry.price_buy,
        location: formatLocation(entry),
        maxSCU: entry.scu_buy_max || 0,
        currentSCU: entry.scu_buy || 0,
        status: entry.status_buy || 0,
        containerSizes: entry.container_sizes?.split("|").map(Number) || [1],
        refreshEstimate: this.calculateRefreshEstimate(entry.status_buy, false),
        statusText: this.getStatusText(entry.status_buy),
      }))
      .sort((a, b) => a.price - b.price);

    const cheapestBuy = buyLocations[0] || null;

    const sellLocations = systemData
      .filter((entry) => entry.price_sell)
      .map((entry) => ({
        price: entry.price_sell,
        location: formatLocation(entry),
        currentSCU: entry.scu_sell || 0,
        status: entry.status_sell || 0,
        containerSizes: entry.container_sizes?.split("|").map(Number) || [1],
        refreshEstimate: this.calculateRefreshEstimate(
          entry.status_sell,
          false
        ),
        statusText: this.getStatusText(entry.status_sell),
      }))
      .sort((a, b) => b.price - a.price);

    if (!sellLocations.length) {
      return await interaction.editReply({
        content: `❌ No sell locations found for ${commodityName} in ${systemName}.`,
        ephemeral: true,
      });
    }

    if (!amount || !inputType) {
      const embed = new EmbedBuilder()
        .setTitle(`💎 ${commodityName} Market Report`)
        .setColor(0x4caf50)
        .addFields(
          { name: "━━━━━━━━━  SYSTEM  ━━━━━━━━━", value: "\u200B" },
          {
            name: "Star System",
            value: `\`\`\`fix\n${systemName}\`\`\``,
            inline: true,
          },
          {
            name: "Commodity",
            value: `\`\`\`fix\n${commodityName}\`\`\``,
            inline: true,
          },
          { name: "━━━━━━━━━  BEST BUY  ━━━━━━━━━", value: "\u200B" },
          {
            name: "Price",
            value: `\`\`\`diff\n- ${cheapestBuy.price.toLocaleString()} aUEC/SCU\`\`\``,
            inline: true,
          },
          {
            name: "Location",
            value: `\`\`\`${cheapestBuy.location}\`\`\``,
            inline: true,
          },
          {
            name: "Max Available",
            value: `\`\`\`${cheapestBuy.maxSCU.toLocaleString()} SCU\`\`\``,
            inline: true,
          },
          {
            name: "Current Stock",
            value: `\`\`\`${cheapestBuy.currentSCU.toLocaleString()} SCU\`\`\``,
            inline: true,
          },
          {
            name: "Container Sizes",
            value: `\`\`\`${cheapestBuy.containerSizes.join("|")} SCU\`\`\``,
            inline: true,
          }
        );

      if (cheapestBuy.refreshEstimate) {
        embed.addFields(
          {
            name: "Inventory Status",
            value: `\`\`\`${cheapestBuy.statusText}\`\`\``,
            inline: true,
          },
          {
            name: "Estimated Restock",
            value: this.formatTimestamp(cheapestBuy.refreshEstimate),
            inline: true,
          }
        );
      }

      const sellOptions = sellLocations
        .map(
          (loc, index) =>
            `${index + 1}. ${loc.price.toLocaleString()} aUEC @ ${loc.location}`
        )
        .join("\n");

      embed.addFields(
        { name: "━━━━━━━━━  SELL LOCATIONS  ━━━━━━━━━", value: "\u200B" },
        { name: "Available Sell Points", value: `\`\`\`${sellOptions}\`\`\`` }
      );

      embed
        .setFooter({
          text: "UEX API | PsychicRoot",
          iconURL: "https://uexcorp.space/favicon.ico",
        })
        .setTimestamp();
      return await interaction.editReply({ embeds: [embed] });
    }

    if (!cheapestBuy) {
      return await interaction.editReply({
        content: `❌ No buy locations found for ${commodityName} in ${systemName}.`,
        ephemeral: true,
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("sell_location_select")
      .setPlaceholder("Select a sell location")
      .addOptions(
        sellLocations.map((loc, index) => ({
          label: `${index + 1}. ${loc.price.toLocaleString()} aUEC`,
          description:
            loc.location.length > 100
              ? loc.location.slice(0, 97) + "..."
              : loc.location,
          value: index.toString(),
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setTitle(`💎 ${commodityName} Trade Setup`)
      .setColor(0x4caf50)
      .setDescription(
        `Please select where you want to sell your ${commodityName} from the menu below.`
      )
      .addFields(
        { name: "Buy Location", value: `\`\`\`${cheapestBuy.location}\`\`\`` },
        {
          name: "Buy Price",
          value: `\`\`\`${cheapestBuy.price.toLocaleString()} aUEC/SCU\`\`\``,
        },
        {
          name: "Input Amount",
          value: `\`\`\`${amount} ${inputType.toUpperCase()}\`\`\``,
        },
        {
          name: "Container Sizes",
          value: `\`\`\`${cheapestBuy.containerSizes.join("|")} SCU\`\`\``,
          inline: true,
        }
      );

    if (cheapestBuy.refreshEstimate) {
      embed.addFields(
        {
          name: "Inventory Status",
          value: `\`\`\`${cheapestBuy.statusText}\`\`\``,
          inline: true,
        },
        {
          name: "Estimated Restock",
          value: this.formatTimestamp(cheapestBuy.refreshEstimate),
          inline: true,
        }
      );
    }

    await interaction.editReply({ embeds: [embed], components: [row] });

    const filter = (i) =>
      i.customId === "sell_location_select" &&
      i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      try {
        await i.deferUpdate();
        const selected = sellLocations[parseInt(i.values[0])];

        let scuAmount, totalCost, totalRevenue;
        if (inputType === "scu") {
          scuAmount = amount;
          totalCost = cheapestBuy.price * scuAmount;
          totalRevenue = selected.price * scuAmount;
        } else {
          scuAmount = Math.floor(amount / cheapestBuy.price);
          totalCost = amount;
          totalRevenue = selected.price * scuAmount;
        }

        const profit = totalRevenue - totalCost;
        const profitPerSCU = selected.price - cheapestBuy.price;

        const result = new EmbedBuilder()
          .setTitle(`💰 ${commodityName} Profit Calculation`)
          .setColor(0x4caf50)
          .addFields(
            {
              name: "Buy Location",
              value: `\`\`\`${cheapestBuy.location}\`\`\``,
            },
            {
              name: "Buy Price",
              value: `\`\`\`${cheapestBuy.price.toLocaleString()} aUEC/SCU\`\`\``,
            },
            {
              name: "Sell Location",
              value: `\`\`\`${selected.location}\`\`\``,
            },
            {
              name: "Sell Price",
              value: `\`\`\`${selected.price.toLocaleString()} aUEC/SCU\`\`\``,
            },
            {
              name: "Container Sizes",
              value: `\`\`\`${selected.containerSizes.join("|")} SCU\`\`\``,
              inline: true,
            },
            {
              name: "Current Stock",
              value: `\`\`\`${selected.currentSCU.toLocaleString()} SCU\`\`\``,
              inline: true,
            },
            { name: "━━━━━━━━━  CALCULATIONS  ━━━━━━━━━", value: "\u200B" },
            {
              name: "Input Amount",
              value: `\`\`\`${amount.toLocaleString()} ${inputType.toUpperCase()}\`\`\``,
              inline: true,
            },
            {
              name: "Equivalent SCU",
              value: `\`\`\`${scuAmount.toLocaleString()} SCU\`\`\``,
              inline: true,
            },
            {
              name: "Total Cost",
              value: `\`\`\`diff\n- ${totalCost.toLocaleString()} aUEC\`\`\``,
              inline: true,
            },
            {
              name: "Total Revenue",
              value: `\`\`\`diff\n+ ${totalRevenue.toLocaleString()} aUEC\`\`\``,
              inline: true,
            },
            {
              name: "Net Profit",
              value: `\`\`\`diff\n+ ${profit.toLocaleString()} aUEC\`\`\``,
              inline: true,
            },
            {
              name: "Profit Per SCU",
              value: `\`\`\`diff\n+ ${profitPerSCU.toLocaleString()} aUEC\`\`\``,
              inline: true,
            }
          );

        if (inputType === "scu") {
          const shipInfo = ships
            .map((ship) => {
              const trips = Math.ceil(scuAmount / ship.scu);
              return `${ship.name.padEnd(18)}: ${trips} trip${
                trips > 1 ? "s" : ""
              }`;
            })
            .join("\n");

          result.addFields(
            { name: "━━━━━━━━━  SHIP CAPACITY  ━━━━━━━━━", value: "\u200B" },
            {
              name: "Required Transport Runs",
              value: `\`\`\`${shipInfo}\`\`\``,
            }
          );
        }

        result
          .setFooter({
            text: "UEX API | PsychicRoot",
            iconURL: "https://uexcorp.space/favicon.ico",
          })
          .setTimestamp();
        await i.editReply({ embeds: [result], components: [] });
        collector.stop();
      } catch (err) {
        console.error("Error in collector:", err);
        await i.editReply({
          content: "❌ Error during trade selection.",
          components: [],
        });
      }
    });

    collector.on("end", (collected) => {
      if (!collected.size) {
        interaction
          .editReply({ content: "❌ Trade selection expired.", components: [] })
          .catch(() => {});
      }
    });
  },

  calculateRefreshEstimate(status, isIllegal) {
    if (!status) return null;
    const now = Math.floor(Date.now() / 1000);
    return isIllegal
      ? status >= 80
        ? now + 7200
        : status >= 50
        ? now + 3600
        : now + 1800
      : status >= 80
      ? now + 3600
      : status >= 50
      ? now + 1800
      : now + 900;
  },

  getStatusText(status) {
    if (!status) return "Unknown";
    if (status >= 80) return "High (80-100%)";
    if (status >= 50) return "Medium (50-79%)";
    if (status >= 20) return "Low (20-49%)";
    return "Very Low (<20%)";
  },

  formatTimestamp(timestamp) {
    return timestamp ? `<t:${timestamp}:R>` : "`Unknown`";
  },
};
