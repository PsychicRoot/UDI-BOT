const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const { GUILD } = require("../../constants/interactionTypes");

// Shared RSVP store
function getEventStore(client) {
  if (!client.eventResponses) client.eventResponses = new Map();
  return client.eventResponses;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("event")
    .setDescription("Opret en begivenhed med popup-indtastning")
    .setContexts([GUILD]),

  async execute(interaction) {
    // Show modal to collect event details
    const modal = new ModalBuilder()
      .setCustomId("event_modal")
      .setTitle("Opret begivenhed");

    const titleInput = new TextInputBuilder()
      .setCustomId("event_title")
      .setLabel("Titel")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const dateInput = new TextInputBuilder()
      .setCustomId("event_date")
      .setLabel("Dato (YYYY-MM-DD)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const timeInput = new TextInputBuilder()
      .setCustomId("event_time")
      .setLabel("Tidspunkt (HH:MM)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const descInput = new TextInputBuilder()
      .setCustomId("event_desc")
      .setLabel("Beskrivelse")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    modal.addComponents(
      { type: 1, components: [titleInput] },
      { type: 1, components: [dateInput] },
      { type: 1, components: [timeInput] },
      { type: 1, components: [descInput] },
    );

    await interaction.showModal(modal);
  },

  // Called from interactionCreate on modal submit
  async handleModalSubmit(interaction) {
    const allowedRoleId = "1388909452115054692";
    const member = interaction.member;
    if (!member.roles.cache.has(allowedRoleId)) {
      return interaction.reply({ content: "❌ Du har ikke tilladelse til at oprette begivenheder.", ephemeral: true });
    }

    const title = interaction.fields.getTextInputValue("event_title");
    const date = interaction.fields.getTextInputValue("event_date");
    const time = interaction.fields.getTextInputValue("event_time");
    const description = interaction.fields.getTextInputValue("event_desc") || "Ingen beskrivelse.";

    const eventResponses = getEventStore(interaction.client);
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
        { name: "🗓️ Dato & Tid", value: `${date} kl. ${time}` },
        { name: "✅ Deltager", value: "Ingen endnu", inline: true },
        { name: "❌ Deltager ikke", value: "Ingen endnu", inline: true },
        { name: "❔ Måske", value: "Ingen endnu", inline: true }
      )
      .setColor(0x3498db)
      .setFooter({ text: `eventId:${eventId}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("rsvp_ja").setLabel("✅ Ja").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("rsvp_nej").setLabel("❌ Nej").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("rsvp_maaske").setLabel("❔ Måske").setStyle(ButtonStyle.Secondary)
    );

    const message = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    // Schedule 30-minute DM reminder
    const eventDateTime = new Date(`${date}T${time}:00`);
    const now = new Date();
    const delay = eventDateTime.getTime() - now.getTime() - 30 * 60 * 1000;
    if (delay > 0) {
      setTimeout(async () => {
        const responses = getEventStore(interaction.client).get(eventId);
        for (const userId of responses.ja) {
          try {
            const user = await interaction.client.users.fetch(userId);
            await user.send(`🔔 Påmindelse: Begivenheden **${title}** starter om 30 minutter (${date} kl. ${time}).`);
          } catch (err) {
            console.error("Fejl ved afsendelse af påmindelse:", err);
          }
        }
      }, delay);
    }

    // Button collector remains the same
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 1000 * 60 * 60 * 6,
    });
    collector.on("end", () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("rsvp_ja").setLabel("✅ Ja").setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId("rsvp_nej").setLabel("❌ Nej").setStyle(ButtonStyle.Danger).setDisabled(true),
        new ButtonBuilder().setCustomId("rsvp_maaske").setLabel("❔ Måske").setStyle(ButtonStyle.Secondary).setDisabled(true)
      );
      message.edit({ components: [disabledRow] });
    });
  },

  async handleButton(interaction) {
    const responseType = interaction.customId.replace("rsvp_", "");
    const embed = interaction.message.embeds[0];
    if (!embed?.footer?.text) {
      return interaction.reply({ content: "❌ Mangler eventId.", ephemeral: true });
    }
    const eventId = embed.footer.text.replace("eventId:", "");
    const responses = getEventStore(interaction.client).get(eventId);
    if (!responses) {
      return interaction.reply({ content: "❌ Event data findes ikke længere eller er udløbet.", ephemeral: true });
    }

    const userId = interaction.user.id;
    responses.ja.delete(userId);
    responses.nej.delete(userId);
    responses.måske.delete(userId);
    if (responseType === "ja") responses.ja.add(userId);
    if (responseType === "nej") responses.nej.add(userId);
    if (responseType === "maaske") responses.måske.add(userId);

    const formatUsers = set => set.size ? [...set].map(id => `<@${id}>`).join("\n") : "Ingen endnu";
    const updatedEmbed = EmbedBuilder.from(embed)
      .spliceFields(1, 3)
      .addFields(
        { name: "✅ Deltager", value: formatUsers(responses.ja), inline: true },
        { name: "❌ Deltager ikke", value: formatUsers(responses.nej), inline: true },
        { name: "❔ Måske", value: formatUsers(responses.måske), inline: true }
      );

    await interaction.update({ embeds: [updatedEmbed], components: interaction.message.components });
  },
};
