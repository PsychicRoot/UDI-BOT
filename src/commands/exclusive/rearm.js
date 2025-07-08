const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// Hardcoded refuel/rearm data for Stanton and Pyro moons
const moonData = {
  // Stanton Moons
  calliope: [
    {
      name: "Shubin Mining Facility SMO-13",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: false,
      padTypes: "S, M",
    },
  ],
  clio: [
    {
      name: "Rayari Anemoi Facility",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: true,
      padTypes: "S, M",
    },
  ],
  euterpe: [
    {
      name: "Shubin Mining Facility SMO-22",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: false,
      padTypes: "M",
    },
  ],
  lyria: [
    {
      name: "Shubin Mining Facility SAL-5",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: true,
      padTypes: "S, M",
    },
  ],
  walla: [
    {
      name: "ArcCorp Mining Area 056",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: false,
      padTypes: "S, M",
    },
  ],
  yela: [
    {
      name: "Kudre Ore Outpost",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: false,
      padTypes: "S, M",
    },
    {
      name: "ArcCorp Mining Area 157",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: true,
      padTypes: "S, M",
    },
  ],
  celin: [
    {
      name: "ArcCorp Mining Area 045",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: false,
      padTypes: "S, M",
    },
  ],
  daymar: [
    {
      name: "Shubin Mining Facility SMO-18",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: true,
      padTypes: "M, L",
    },
    {
      name: "Shubin Mining Facility SMO-22",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: false,
      padTypes: "M",
    },
  ],
  aberdeen: [
    {
      name: "HDMS Anderson",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: true,
      padTypes: "S, M",
    },
  ],
  magda: [
    {
      name: "HDMS Stanhope",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: false,
      padTypes: "S, M",
    },
  ],
  ita: [
    {
      name: "HDMS Woodruff",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: true,
      padTypes: "S, M",
    },
  ],
  arial: [
    {
      name: "HDMS Bezdek",
      starSystem: "Stanton",
      hasRefuel: true,
      hasRearm: true,
      padTypes: "M, L",
    },
  ],
  // Pyro Moons
  ruin: [
    {
      name: "Firebrand Outpost",
      starSystem: "Pyro",
      hasRefuel: true,
      hasRearm: true,
      padTypes: "M, L",
    },
  ],
  charon: [
    {
      name: "Ashen Rest",
      starSystem: "Pyro",
      hasRefuel: true,
      hasRearm: false,
      padTypes: "S, M",
    },
  ],
  inferno: [
    {
      name: "Scorched Depot",
      starSystem: "Pyro",
      hasRefuel: true,
      hasRearm: true,
      padTypes: "M, L",
    },
  ],
  ember: [
    {
      name: "Blazing Refuge",
      starSystem: "Pyro",
      hasRefuel: true,
      hasRearm: false,
      padTypes: "S, M",
    },
  ],
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("refuel")
    .setDescription(
      "Find outposts to refuel on a specific moon in Stanton or Pyro"
    )
    .addStringOption((option) =>
      option
        .setName("moon_name")
        .setDescription("Enter the name of the moon (Yela, Daymar, Ruin, etc.)")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const moonNameInput = interaction.options
        .getString("moon_name")
        .toLowerCase();
      const moonLocations = moonData[moonNameInput];
      if (!moonLocations) {
        await interaction.editReply({
          content: `No data found for the moon: **${
            moonNameInput.charAt(0).toUpperCase() + moonNameInput.slice(1)
          }**. Please ensure the name is correct.`,
        });
        return;
      }
      const fields = moonLocations.map((outpost) => ({
        name: outpost.name,
        value: `**Star System:** ${
          outpost.starSystem
        }\n**Services Available:**\n- Refuel: ${
          outpost.hasRefuel ? "✅ Yes" : "❌ No"
        }\n- Rearm: ${outpost.hasRearm ? "✅ Yes" : "❌ No"}\n**Pad Types:** ${
          outpost.padTypes
        }`,
        inline: false,
      }));
      const embed = new EmbedBuilder()
        .setTitle(
          `Refuel Outposts for Moon: ${
            moonNameInput.charAt(0).toUpperCase() + moonNameInput.slice(1)
          }`
        )
        .setDescription(
          `Here are the outposts on **${
            moonNameInput.charAt(0).toUpperCase() + moonNameInput.slice(1)
          }** where you can refuel.`
        )
        .addFields(fields)
        .setColor(0x007bff)
        .setFooter({
          text: "This data may not be correct, please let me know | Made By PsychicRoot",
        })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Unexpected error in /refuel command:", error.message);
      await interaction.editReply({
        content: "An unexpected error occurred. Please try again later.",
      });
    }
  },
};
