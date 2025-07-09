
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ønsker")
    .setDescription("Fortæl os noget som du godt kunne tænke dig vi gjorde mangler")
    .addStringOption((option) =>
      option
        .setName("request")
        .setDescription("Beskriv hvad du gerne vil havde eller se.")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const request = interaction.options.getString("request");
      const user = interaction.user;
      const staffChannelId = "1392573031959887892"; // Staff review channel
      const publicChannelId = "1392577211638218802"; // Public view-only channel

      const embed = new EmbedBuilder()
        .setTitle("📢 Nyt Ønske")
        .setDescription(request)
        .setColor(0xffd700)
        .addFields(
          { name: "Ønsket af", value: `${user.tag}`, inline: true },
          { name: "User ID", value: `${user.id}`, inline: true }
        )
        .setFooter({
          text: "Ønske modtaget",
          iconURL: user.displayAvatarURL(),
        })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("mark_done")
          .setLabel("Marker som gjort")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("mark_not_done")
          .setLabel("Marker som ikke gjort")
          .setStyle(ButtonStyle.Danger)
      );

      const staffChannel = interaction.client.channels.cache.get(staffChannelId);
      const publicChannel = interaction.client.channels.cache.get(publicChannelId);

      if (!staffChannel || !publicChannel) {
        await interaction.editReply({
          content:
            "Kunne ikke finde en eller begge kanaler til at sende ønsket. Kontakt en admin.",
        });
        return;
      }

      await staffChannel.send({ embeds: [embed], components: [row] });
      await publicChannel.send({ embeds: [embed] }); // No buttons for public

      await interaction.editReply({
        content:
          "Dit ønske er blevet sendt til holdet og også delt offentligt. Tak for dit input!",
      });
    } catch (error) {
      console.error("Fejl under håndtering af ønske:", error);
      await interaction.editReply({
        content:
          "Der opstod en fejl under afsendelse af dit ønske. Prøv igen senere.",
      });
    }
  },
};
