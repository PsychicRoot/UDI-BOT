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
    .setDescription("Find udposter til tankning på en specifik måne i Stanton eller Pyro")
    .addStringOption((option) =>
      option
        .setName("moon_name")
        .setDescription("Indtast navnet på månen/planeten (fx Yela, Daymar, Ruin)")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const input = interaction.options.getString("moon_name").toLowerCase();
      const moonLocations = moonData[input];
      const capitalized = input.charAt(0).toUpperCase() + input.slice(1);

      if (!moonLocations) {
        await interaction.editReply({
          content: `❌ Ingen data fundet for månen **${capitalized}**. Sørg for, at navnet er korrekt.`,
        });
        return;
      }

      const fields = moonLocations.map((outpost) => ({
        name: outpost.name,
        value:
          `**Stjernesystem:** ${outpost.starSystem}\n` +
          `**Tilgængelige tjenester:**\n` +
          `- Tank: ${outpost.hasRefuel ? "✅ Ja" : "❌ Nej"}\n` +
          `- Ammunitionsgenopfyldning: ${outpost.hasRearm ? "✅ Ja" : "❌ Nej"}\n` +
          `**Landertyper:** ${outpost.padTypes}`,
        inline: false,
      }));

      const embed = new EmbedBuilder()
        .setTitle(`Tanknings outposts for måne: ${capitalized}`)
        .setDescription(`Her er outposts på **${capitalized}** hvor du kan tanke.`)
        .addFields(fields)
        .setColor(0x007bff)
        .setFooter({
          text: "Disse data kan være unøjagtige, giv mig besked | Lavet af PsychicRoot",
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Uventet fejl i /refuel-kommandoen:", error.message);
      await interaction.editReply({
        content: "❌ Der opstod en uventet fejl. Prøv igen senere.",
      });
    }
  },
};