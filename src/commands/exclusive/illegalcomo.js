const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const { fetchWithFallback } = require("../../helpers/fetchWithFallback");
const { getToken } = require("../../helpers/tokenDatabase");

const illegalCommodities = [
  "Altruciatoxin",
  "E'tam",
  "Gasping Weevil Eggs",
  "Maze",
  "Neon",
  "Osoian Hides",
  "SLAM",
  "WiDoW",
  "Human Food Bars",
];

const ships = [
  { name: "Herald", scu: 0 },
  { name: "Razor", scu: 2 },
  { name: "350R", scu: 4 },
  { name: "Cutlass Black", scu: 46 },
  { name: "Freelancer MIS", scu: 66 },
  { name: "MSR", scu: 114 },
  { name: "Constellation Taurus", scu: 174 },
  { name: "Caterpillar", scu: 576 },
  { name: "Corsair", scu: 72 },
  { name: "Hull B", scu: 384 },
  { name: "Hull C", scu: 4608 },
];

const systems = ["Stanton", "Pyro"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("illegalcommodities")
    .setDescription(
      "Retrieve prices and profit calculations for illegal commodities"
    )
    .addStringOption((option) =>
      option
        .setName("commodity_name")
        .setDescription("Select an illegal commodity")
        .setRequired(true)
        .addChoices(...illegalCommodities.map((c) => ({ name: c, value: c })))
    )
    .addStringOption((option) =>
      option
        .setName("system")
        .setDescription("Select a star system")
        .setRequired(true)
        .addChoices(...systems.map((s) => ({ name: s, value: s })))
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

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const guildId = interaction.guild.id;
      const token = await getToken(guildId);

      if (!token) {
        await interaction.editReply({
          content:
            "❌ No API token configured. Please use `/token <your_token>` to set one.",
          ephemeral: true,
        });
        return;
      }

      const commodityName = interaction.options.getString("commodity_name");
      const systemName = interaction.options.getString("system");
      const inputType = interaction.options.getString("input_type");
      const amount = interaction.options.getInteger("amount");

      const apiUrl = `https://api.uexcorp.space/2.0/commodities_prices?commodity_name=${encodeURIComponent(
        commodityName
      )}`;
      let data;
      try {
        data = await fetchWithFallback(apiUrl, token);
        if (!data?.data) {
          throw new Error("Invalid API response structure");
        }
      } catch (error) {
        console.error("API fetch error:", error);
        throw new Error("Failed to fetch commodity data from UEX API");
      }

      const systemData = data.data.filter((entry) => {
        const systemMatch =
          entry.star_system_name?.toLowerCase() === systemName.toLowerCase();
        const commodityMatch =
          entry.commodity_name?.toLowerCase() === commodityName.toLowerCase();
        const isIllegal =
          entry.is_illegal || illegalCommodities.includes(entry.commodity_name);
        const hasPrice = entry.price_buy || entry.price_sell;
        return systemMatch && commodityMatch && isIllegal && hasPrice;
      });

      if (systemData.length === 0) {
        await interaction.editReply({
          content: `❌ No valid price data found for ${commodityName} in ${systemName}.`,
          ephemeral: true,
        });
        return;
      }

      const buyLocations = systemData
        .filter((entry) => entry.price_buy)
        .map((entry) => ({
          price: entry.price_buy,
          location: `${entry.terminal_name || "Unknown Terminal"} @ ${
            entry.city_name || entry.planet_name || "Unknown Location"
          }`,
          maxSCU: entry.scu_buy_max || 0,
          currentSCU: entry.scu_buy || 0,
          status: entry.status_buy || 0,
          containerSizes: entry.container_sizes
            ? entry.container_sizes.split("|").map(Number)
            : [1],
          refreshEstimate: this.calculateRefreshEstimate(
            entry.status_buy,
            true
          ),
          statusText: this.getStatusText(entry.status_buy),
        }))
        .sort((a, b) => a.price - b.price);

      const cheapestBuy = buyLocations[0] || null;

      const sellLocations = systemData
        .filter((entry) => entry.price_sell)
        .map((entry) => ({
          price: entry.price_sell,
          location: `${entry.terminal_name || "Unknown Terminal"} @ ${
            entry.city_name || entry.planet_name || "Unknown Location"
          }`,
          currentSCU: entry.scu_sell || 0,
          status: entry.status_sell || 0,
          containerSizes: entry.container_sizes
            ? entry.container_sizes.split("|").map(Number)
            : [1],
          refreshEstimate: this.calculateRefreshEstimate(
            entry.status_sell,
            true
          ),
          statusText: this.getStatusText(entry.status_sell),
        }))
        .sort((a, b) => b.price - a.price);

      if (sellLocations.length === 0) {
        await interaction.editReply({
          content: `❌ No sell locations found for ${commodityName} in ${systemName}.`,
          ephemeral: true,
        });
        return;
      }

      if (!amount || !inputType) {
        const embed = new EmbedBuilder()
          .setTitle(`⚠️ ${commodityName} Black Market Report`)
          .setColor(0xff4c4c)
          .addFields(
            { name: "━━━━━━━━━  SYSTEM  ━━━━━━━━━", value: "\u200B" },
            {
              name: "Star System",
              value: `\`\`\`fix\n${systemName}\`\`\``,
              inline: true,
            },
            {
              name: "Contraband",
              value: `\`\`\`fix\n${commodityName}\`\`\``,
              inline: true,
            }
          );

        if (cheapestBuy) {
          embed.addFields(
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
              value: `\`\`\`${
                cheapestBuy.containerSizes?.join("|") || "1"
              } SCU\`\`\``,
              inline: true,
            }
          );

          if (cheapestBuy.refreshEstimate) {
            embed.addFields(
              {
                name: "Black Market Status",
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
        } else {
          embed.addFields(
            { name: "━━━━━━━━━  BUY LOCATIONS  ━━━━━━━━━", value: "\u200B" },
            {
              name: "No Buy Locations",
              value: "```No valid buy locations found for this contraband```",
            }
          );
        }

        const sellOptions = sellLocations
          .map(
            (loc, index) =>
              `${index + 1}. ${loc.price.toLocaleString()} aUEC @ ${
                loc.location
              }`
          )
          .join("\n");

        embed.addFields(
          { name: "━━━━━━━━━  SELL LOCATIONS  ━━━━━━━━━", value: "\u200B" },
          {
            name: "Available Black Markets",
            value: `\`\`\`${sellOptions}\`\`\``,
          }
        );

        embed.addFields(
          { name: "━━━━━━━━━  WARNING  ━━━━━━━━━", value: "\u200B" },
          {
            name: "⚠️ Criminal Activity",
            value:
              "```diff\n- Transporting illegal goods may result in:\n- Fines\n- Cargo confiscation\n- Criminal charges\n- Ship impoundment```",
          }
        );

        embed
          .setFooter({
            text: "UEX API | PsychicRoot",
            iconURL: "https://uexcorp.space/favicon.ico",
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (!cheapestBuy) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("sell_location_select")
          .setPlaceholder("Select a black market")
          .addOptions(
            sellLocations.map((loc, index) => ({
              label: `${index + 1}. ${loc.price.toLocaleString()} aUEC`,
              description:
                loc.location.length > 100
                  ? loc.location.substring(0, 97) + "..."
                  : loc.location,
              value: index.toString(),
            }))
          );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const initialEmbed = new EmbedBuilder()
          .setTitle(`⚠️ ${commodityName} Black Market Value`)
          .setColor(0xff4c4c)
          .setDescription(
            `No buy locations found. Showing potential sell value for your ${commodityName}.`
          )
          .addFields({
            name: "Input Amount",
            value: `\`\`\`${amount} ${inputType.toUpperCase()}\`\`\``,
          });

        await interaction.editReply({
          embeds: [initialEmbed],
          components: [row],
        });

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
            const selectedIndex = parseInt(i.values[0]);
            const selectedSell = sellLocations[selectedIndex];

            let scuAmount, totalRevenue;

            if (inputType === "scu") {
              scuAmount = amount;
              totalRevenue = selectedSell.price * amount;
            } else {
              scuAmount = "N/A";
              totalRevenue = "N/A (No buy price available)";
            }

            const resultEmbed = new EmbedBuilder()
              .setTitle(`💰 ${commodityName} Black Market Value`)
              .setColor(0xff4c4c)
              .addFields(
                { name: "━━━━━━━━━  SELL DETAILS  ━━━━━━━━━", value: "\u200B" },
                {
                  name: "Sell Location",
                  value: `\`\`\`${selectedSell.location}\`\`\``,
                },
                {
                  name: "Sell Price",
                  value: `\`\`\`${selectedSell.price.toLocaleString()} aUEC/SCU\`\`\``,
                },
                {
                  name: "Container Sizes",
                  value: `\`\`\`${
                    selectedSell.containerSizes?.join("|") || "1"
                  } SCU\`\`\``,
                  inline: true,
                },
                {
                  name: "Current Stock",
                  value: `\`\`\`${selectedSell.currentSCU.toLocaleString()} SCU\`\`\``,
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
                  value: `\`\`\`${scuAmount}\`\`\``,
                  inline: true,
                },
                {
                  name: "Potential Revenue",
                  value:
                    inputType === "scu"
                      ? `\`\`\`diff\n+ ${totalRevenue.toLocaleString()} aUEC\`\`\``
                      : `\`\`\`${totalRevenue}\`\`\``,
                  inline: true,
                }
              );

            if (inputType === "scu") {
              const shipInfo = ships
                .filter((ship) => ship.scu > 0)
                .sort((a, b) => b.scu - a.scu)
                .map((ship) => {
                  const trips = Math.ceil(amount / ship.scu);
                  return `${ship.name.padEnd(18)}: ${trips} trip${
                    trips > 1 ? "s" : ""
                  }`;
                })
                .join("\n");

              resultEmbed.addFields(
                {
                  name: "━━━━━━━━━  SHIP CAPACITY  ━━━━━━━━━",
                  value: "\u200B",
                },
                {
                  name: "Required Transport Runs",
                  value: `\`\`\`${shipInfo}\`\`\``,
                }
              );
            }

            if (selectedSell.refreshEstimate) {
              resultEmbed.addFields(
                {
                  name: "Demand",
                  value: `\`\`\`${selectedSell.statusText}\`\`\``,
                  inline: true,
                },
                {
                  name: "Estimated Restock",
                  value: this.formatTimestamp(selectedSell.refreshEstimate),
                  inline: true,
                }
              );
            }

            resultEmbed.addFields(
              { name: "━━━━━━━━━  WARNING  ━━━━━━━━━", value: "\u200B" },
              {
                name: "⚠️ Criminal Activity",
                value:
                  "```diff\n- Transporting illegal goods may result in:\n- Fines\n- Cargo confiscation\n- Criminal charges\n- Ship impoundment```",
              }
            );

            resultEmbed
              .setFooter({
                text: "UEX API | PsychicRoot",
                iconURL: "https://uexcorp.space/favicon.ico",
              })
              .setTimestamp();

            await i.editReply({
              embeds: [resultEmbed],
              components: [],
            });

            collector.stop();
          } catch (error) {
            console.error("Error processing selection:", error);
            await i.editReply({
              content: "❌ An error occurred while processing your selection.",
              components: [],
            });
          }
        });

        collector.on("end", (collected) => {
          if (collected.size === 0) {
            interaction
              .editReply({
                content: "❌ You did not select a black market in time.",
                components: [],
              })
              .catch(console.error);
          }
        });

        return;
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("sell_location_select")
        .setPlaceholder("Select a black market")
        .addOptions(
          sellLocations.map((loc, index) => ({
            label: `${index + 1}. ${loc.price.toLocaleString()} aUEC`,
            description:
              loc.location.length > 100
                ? loc.location.substring(0, 97) + "..."
                : loc.location,
            value: index.toString(),
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const initialEmbed = new EmbedBuilder()
        .setTitle(`⚠️ ${commodityName} Smuggling Setup`)
        .setColor(0xff4c4c)
        .setDescription(
          `Please select where you want to sell your ${commodityName} from the menu below.`
        )
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
            name: "Input Amount",
            value: `\`\`\`${amount} ${inputType.toUpperCase()}\`\`\``,
          },
          {
            name: "Container Sizes",
            value: `\`\`\`${
              cheapestBuy.containerSizes?.join("|") || "1"
            } SCU\`\`\``,
            inline: true,
          }
        );

      if (cheapestBuy.refreshEstimate) {
        initialEmbed.addFields(
          {
            name: "Black Market Status",
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

      await interaction.editReply({
        embeds: [initialEmbed],
        components: [row],
      });

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
          const selectedIndex = parseInt(i.values[0]);
          const selectedSell = sellLocations[selectedIndex];

          let scuAmount, totalCost, totalRevenue, profit, profitPerSCU;

          if (inputType === "scu") {
            scuAmount = amount;
            totalCost = cheapestBuy.price * amount;
            totalRevenue = selectedSell.price * amount;
          } else {
            scuAmount = Math.floor(amount / cheapestBuy.price);
            totalCost = amount;
            totalRevenue = selectedSell.price * scuAmount;
          }

          profit = totalRevenue - totalCost;
          profitPerSCU = selectedSell.price - cheapestBuy.price;

          const resultEmbed = new EmbedBuilder()
            .setTitle(`💰 ${commodityName} Smuggling Profit`)
            .setColor(0xff4c4c)
            .addFields(
              {
                name: "━━━━━━━━━  SMUGGLING DETAILS  ━━━━━━━━━",
                value: "\u200B",
              },
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
                value: `\`\`\`${selectedSell.location}\`\`\``,
              },
              {
                name: "Sell Price",
                value: `\`\`\`${selectedSell.price.toLocaleString()} aUEC/SCU\`\`\``,
              },
              {
                name: "Container Sizes",
                value: `\`\`\`${
                  selectedSell.containerSizes?.join("|") || "1"
                } SCU\`\`\``,
                inline: true,
              },
              {
                name: "Current Stock",
                value: `\`\`\`${selectedSell.currentSCU.toLocaleString()} SCU\`\`\``,
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

          if (selectedSell.refreshEstimate) {
            resultEmbed.addFields(
              {
                name: "Demand",
                value: `\`\`\`${selectedSell.statusText}\`\`\``,
                inline: true,
              },
              {
                name: "Estimated Restock",
                value: this.formatTimestamp(selectedSell.refreshEstimate),
                inline: true,
              }
            );
          }

          if (inputType === "scu") {
            const shipInfo = ships
              .filter((ship) => ship.scu > 0)
              .sort((a, b) => b.scu - a.scu)
              .map((ship) => {
                const trips = Math.ceil(scuAmount / ship.scu);
                return `${ship.name.padEnd(18)}: ${trips} trip${
                  trips > 1 ? "s" : ""
                }`;
              })
              .join("\n");

            resultEmbed.addFields(
              { name: "━━━━━━━━━  SHIP CAPACITY  ━━━━━━━━━", value: "\u200B" },
              {
                name: "Required Smuggling Runs",
                value: `\`\`\`${shipInfo}\`\`\``,
              }
            );
          }

          resultEmbed.addFields(
            { name: "━━━━━━━━━  WARNING  ━━━━━━━━━", value: "\u200B" },
            {
              name: "⚠️ Criminal Activity",
              value:
                "```diff\n- Transporting illegal goods may result in:\n- Fines\n- Cargo confiscation\n- Criminal charges\n- Ship impoundment```",
            }
          );

          resultEmbed
            .setFooter({
              text: "UEX API | PsychicRoot",
              iconURL: "https://uexcorp.space/favicon.ico",
            })
            .setTimestamp();

          await i.editReply({
            embeds: [resultEmbed],
            components: [],
          });

          collector.stop();
        } catch (error) {
          console.error("Error processing selection:", error);
          await i.editReply({
            content: "❌ An error occurred while processing your selection.",
            components: [],
          });
        }
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          interaction
            .editReply({
              content: "❌ You did not select a black market in time.",
              components: [],
            })
            .catch(console.error);
        }
      });
    } catch (error) {
      console.error("Illegal Commodities command error:", error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },

  calculateRefreshEstimate(status, isIllegal) {
    if (!status) return null;
    const now = Math.floor(Date.now() / 1000);

    if (isIllegal) {
      if (status >= 80) return now + 7200; // 2 hours if nearly full
      if (status >= 50) return now + 3600; // 1 hour if half full
      return now + 1800; // 30 min if low
    } else {
      if (status >= 80) return now + 3600; // 1 hour if nearly full
      if (status >= 50) return now + 1800; // 30 min if half full
      return now + 900; // 15 min if low
    }
  },

  getStatusText(status) {
    if (!status) return "Unknown";
    if (status >= 80) return "High (80-100%)";
    if (status >= 50) return "Medium (50-79%)";
    if (status >= 20) return "Low (20-49%)";
    return "Very Low (<20%)";
  },

  formatTimestamp(timestamp) {
    if (!timestamp) return "```Unknown```";
    return `<t:${timestamp}:R>`;
  },
};
