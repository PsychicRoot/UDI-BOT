const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
  } = require("discord.js");
  
  const { GUILD } = require("../../constants/interactionTypes");
  
  // In-memory RSVP tracking
  const eventResponses = new Map();
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName("event")
      .setDescription("Opret en begivenhed med Ja/Nej/Måske valg")
      .addStringOption((option) =>
        option.setName("titel").setDescription("Navn på begivenheden").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("beskrivelse").setDescription("Valgfri beskrivelse").setRequired(false)
      )
      .setContexts([GUILD]),
  
    async execute(interaction) {
      const allowedRoleId = "1388909452115054692"; // ⬅️ Replace this with your actual role ID
  
      const member = interaction.member;
  
      if (!member.roles.cache.has(allowedRoleId)) {
        await interaction.reply({
          content: `❌ Du har ikke tilladelse til at bruge denne kommando. Kun medlemmer med den specifikke rolle kan oprette events.`,
          ephemeral: true,
        });
        return;
      }
  
      const title = interaction.options.getString("titel");
      const description = interaction.options.getString("beskrivelse") || "Ingen beskrivelse.";
  
      const eventId = `${interaction.channel.id}-${Date.now()}`;
      eventResponses.set(eventId, {
        ja: new Set(),
        nej: new Set(),
        måske: new Set(),
      });
  
      const embed = new EmbedBuilder()
        .setTitle(`📅 ${title}`)
        .setDescription(description)
        .addFields(
          { name: "✅ Deltager", value: "Ingen endnu", inline: true },
          { name: "❌ Deltager ikke", value: "Ingen endnu", inline: true },
          { name: "❔ Måske", value: "Ingen endnu", inline: true }
        )
        .setColor(0x3498db)
        .setFooter({ text: "Klik på en knap for at angive dit svar" })
        .setTimestamp();
  
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ja-${eventId}`).setLabel("✅ Ja").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`nej-${eventId}`).setLabel("❌ Nej").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`maaske-${eventId}`).setLabel("❔ Måske").setStyle(ButtonStyle.Secondary)
      );
  
      const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 1000 * 60 * 60 * 6, // 6 timer
      });
  
      collector.on("collect", async (btnInteraction) => {
        const userId = btnInteraction.user.id;
        const idParts = btnInteraction.customId.split("-");
        const responseType = idParts[0];
  
        const responses = eventResponses.get(eventId);
        if (!responses) return;
  
        // Fjern bruger fra alle svar
        responses.ja.delete(userId);
        responses.nej.delete(userId);
        responses.måske.delete(userId);
  
        // Tilføj til valgt svar
        if (responseType === "ja") responses.ja.add(userId);
        if (responseType === "nej") responses.nej.add(userId);
        if (responseType === "maaske") responses.måske.add(userId);
  
        const formatUsers = (set) =>
          set.size ? [...set].map((id) => `<@${id}>`).join("\n") : "Ingen endnu";
  
        const updatedEmbed = EmbedBuilder.from(embed)
          .spliceFields(0, 3)
          .addFields(
            { name: "✅ Deltager", value: formatUsers(responses.ja), inline: true },
            { name: "❌ Deltager ikke", value: formatUsers(responses.nej), inline: true },
            { name: "❔ Måske", value: formatUsers(responses.måske), inline: true }
          );
  
        await btnInteraction.update({ embeds: [updatedEmbed], components: [row] });
      });
  
      collector.on("end", () => {
        const rowDisabled = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`ja-${eventId}`).setLabel("✅ Ja").setStyle(ButtonStyle.Success).setDisabled(true),
          new ButtonBuilder().setCustomId(`nej-${eventId}`).setLabel("❌ Nej").setStyle(ButtonStyle.Danger).setDisabled(true),
          new ButtonBuilder().setCustomId(`maaske-${eventId}`).setLabel("❔ Måske").setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
  
        message.edit({ components: [rowDisabled] });
      });
    },
  };
  