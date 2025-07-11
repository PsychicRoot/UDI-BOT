const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Viser en liste over tilgængelige kommandoer og deres beskrivelser"),

  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setTitle("📖 Bot Kommando Hjælp")
        .setDescription("Her er en liste over tilgængelige kommandoer og hvad de gør:")
        .setColor(0x00aaff)
        .addFields(
          {
            name: "/legalcommodities",
            value: "Viser information om lovlige varer.",
          },
          {
            name: "/illegalcommodities",
            value: "Viser information om ulovlige varer.",
          },
          {
            name: "/mining",
            value: "Giver detaljer om minedrift og relevante materialer.",
          },
          {
            name: "/refuel",
            value: "Viser hvor du kan finde refuel points på en given planet/måne.",
          },
          {
            name: "/refreshcommodities",
            value: "Opdaterer varedata og priser.",
          },
          {
            name: "/ønsker",
            value: "Sender en ændringsanmodning til leder holdet.",
          },
          {
            name: "/collectitems",
            value: "Lister indsamlede genstande og deres lokationer.",
          },
          {
            name: "/event",
            value: "Viser planlagte begivenheder og detaljer.",
          },
          {
            name: "/finditem",
            value: "Henter information om en specifik genstand.",
          }
        )
        .setFooter({
          text: "Brug /help for at se denne liste når som helst!",
          iconURL: "https://uexcorp.space/favicon.ico",
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Fejl ved visning af help kommando:", error);
      await interaction.reply({
        content: "Der opstod en fejl under hentning af hjælpeinformationen. Prøv igen senere.",
        ephemeral: true,
      });
    }
  },
};
