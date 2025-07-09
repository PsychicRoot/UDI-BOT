const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  TextInputStyle
} = require("discord.js");
const { DateTime } = require("luxon"); // For timezone-aware parsing

// Shared RSVP store
function getEventStore(client) {
  if (!client.eventResponses) client.eventResponses = new Map();
  return client.eventResponses;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("event")
    .setDescription("Opret en begivenhed med popup-indtastning"),

  // Trigger modal
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("event_modal")
      .setTitle("Opret begivenhed");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("event_title")
          .setLabel("Titel")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("event_date")
          .setLabel("Dato (DD-MM-YYYY)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("event_time")
          .setLabel("Tidspunkt (HH:MM)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("event_desc")
          .setLabel("Beskrivelse")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
      )
    );

    await interaction.showModal(modal);
  },

  // Handle modal submission
  async handleModalSubmit(interaction) {
    const title = interaction.fields.getTextInputValue("event_title");
    const date = interaction.fields.getTextInputValue("event_date");
    const time = interaction.fields.getTextInputValue("event_time");
    const description = interaction.fields.getTextInputValue("event_desc") || "Ingen beskrivelse.";

    // Parse date/time in user's timezone (Europe/Copenhagen)
    const dt = DateTime.fromFormat(
      `${date} ${time}`,
      "dd-MM-yyyy HH:mm",
      { zone: "Europe/Copenhagen" }
    );

    // Validate parsing
    if (!dt.isValid) {
      return interaction.reply({
        content: "❌ Ugyldig dato eller tidspunkt. Brug format DD-MM-YYYY og HH:MM.",
        ephemeral: true
      });
    }

    const eventTimestampMs = dt.toMillis();
    const eventDate = new Date(eventTimestampMs);
    const tsSec = Math.floor(dt.toSeconds());
    const nowMs = Date.now();

    // Calculate delays
    const reminderDelayMs = eventTimestampMs - nowMs - 30 * 60 * 1000;
    const collectorDurationMsRaw = eventTimestampMs - nowMs - 40 * 60 * 1000;
    const collectorDurationMs = collectorDurationMsRaw > 0 ? collectorDurationMsRaw : 0;

    const eventResponses = getEventStore(interaction.client);
    const eventId = `${interaction.channel.id}-${Date.now()}`;
    eventResponses.set(eventId, { ja: new Set(), nej: new Set(), måske: new Set() });

    const embed = new EmbedBuilder()
      .setTitle(`📅 ${title}`)
      .setDescription(description)
      .addFields(
        { name: "🗓️ Start tid", value: `<t:${tsSec}:f> (<t:${tsSec}:R>)` },
        { name: "✅ Deltager", value: "Ingen endnu", inline: true },
        { name: "❌ Deltager ikke", value: "Ingen endnu", inline: true },
        { name: "❔ Måske", value: "Ingen endnu", inline: true }
      )
      .setFooter({ text: `eventId:${eventId}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("rsvp_ja").setLabel("✅ Ja").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("rsvp_nej").setLabel("❌ Nej").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("rsvp_maaske").setLabel("❔ Måske").setStyle(ButtonStyle.Secondary)
    );

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    // Schedule reminder 30 minutes before
    if (reminderDelayMs > 0) {
      setTimeout(async () => {
        const responses = eventResponses.get(eventId);
        for (const userId of responses.ja) {
          try {
            const user = await interaction.client.users.fetch(userId);
            await user.send(
              `🔔 Påmindelse: **${title}** starter om 30 minutter: <t:${tsSec}:R>`
            );
          } catch (err) {
            console.error("Fejl ved afsendelse af påmindelse:", err);
          }
        }
      }, reminderDelayMs);
    }

    // RSVP collector — close 40 minutes before start
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: collectorDurationMs
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("rsvp_ja")
          .setLabel("✅ Ja")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("rsvp_nej")
          .setLabel("❌ Nej")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("rsvp_maaske")
          .setLabel("❔ Måske")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      try {
        await message.edit({ components: [disabledRow] });
      } catch (err) {
        console.error("Kunne ikke deaktivere RSVP-knapperne:", err);
      }
    });
  },

  // Handle button presses
  async handleButton(interaction) {
    const responseType = interaction.customId.replace("rsvp_", "");
    const embed = interaction.message.embeds[0];
    if (!embed?.footer?.text) return interaction.reply({ content: "❌ Mangler eventId.", ephemeral: true });

    const eventId = embed.footer.text.replace("eventId:", "");
    const responses = getEventStore(interaction.client).get(eventId);
    if (!responses) return interaction.reply({ content: "❌ Event data findes ikke længere.", ephemeral: true });

    const userId = interaction.user.id;
    responses.ja.delete(userId);
    responses.nej.delete(userId);
    responses.måske.delete(userId);
    if (responseType === "ja") responses.ja.add(userId);
    if (responseType === "nej") responses.nej.add(userId);
    if (responseType === "maaske") responses.måske.add(userId);

    const format = set => (set.size ? [...set].map(id => `<@${id}>`).join("\n") : "Ingen endnu");
    const updatedEmbed = EmbedBuilder.from(embed)
      .spliceFields(1, 3)
      .addFields(
        { name: "✅ Deltager", value: format(responses.ja), inline: true },
        { name: "❌ Deltager ikke", value: format(responses.nej), inline: true },
        { name: "❔ Måske", value: format(responses.måske), inline: true }
      );
    await interaction.update({ embeds: [updatedEmbed], components: interaction.message.components });
  }
};
