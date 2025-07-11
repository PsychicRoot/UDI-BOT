const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Viser en liste over tilgængelige kommandoer og deres beskrivelser"),

  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setTitle("📖 Bot Kommando Hjælp / Bot Commands Help")
        .setDescription("Her er en liste over tilgængelige kommandoer og hvad de gør")
        .setColor(0x00aaff)
        .addFields(
          {
            name: "/legalcommodities",
            value: "Viser priser og info for lovlige varer i Star Citizen.",
          },
          {
            name: "/illegalcommodities",
            value: "Viser priser og info for ulovlige varer i Star Citizen.",
          },
          {
            name: "/changelogs",
            value: "Viser de seneste ændringslogs for botten.",
          },
          {
            name: "/music <command>",
            value: "Musikafspilning og kontrolkommandoer.",
          },
          {
            name: "/suggestion",
            value: "Send forslag til ændringer i botten.",
          }
        )
        .setFooter({
          text: "Brug /help for at se denne liste når som helst!",
          iconURL: "https://uexcorp.space/favicon.ico",
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error displaying help command:", error);
      await interaction.reply({
        content: "Der opstod en fejl under hentning af hjælpeinformationen. Prøv igen senere.\nAn error occurred while fetching the help information. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
