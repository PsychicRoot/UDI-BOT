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
const { DateTime } = require("luxon");

// Helper to support timeouts longer than 2,147,483,647ms (~24.8 days)
const MAX_TIMEOUT = 2_147_483_647;
function safeTimeout(fn, delay) {
  if (delay <= MAX_TIMEOUT) {
    return setTimeout(fn, delay);
  }
  return setTimeout(() => {
    safeTimeout(fn, delay - MAX_TIMEOUT);
  }, MAX_TIMEOUT);
}

// Shared RSVP store
function getEventStore(client) {
  if (!client.eventResponses) client.eventResponses = new Map();
  return client.eventResponses;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("event")
    .setDescription("Opret en begivenhed med popup-indtastning"),

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

  async handleModalSubmit(interaction) {
    const title = interaction.fields.getTextInputValue("event_title");
    const date = interaction.fields.getTextInputValue("event_date");
    const time = interaction.fields.getTextInputValue("event_time");
    const description = interaction.fields.getTextInputValue("event_desc") || "Ingen beskrivelse.";

    const dt = DateTime.fromFormat(`${date} ${time}`, "dd-MM-yyyy HH:mm", {
      zone: "Europe/Copenhagen"
    });

    if (!dt.isValid) {
      return interaction.reply({
        content: "❌ Ugyldig dato eller tidspunkt. Brug format DD-MM-YYYY og HH:MM.",
        ephemeral: true
      });
    }

    const tsSec = Math.floor(dt.toSeconds());
    const now = DateTime.now().setZone("Europe/Copenhagen");

    const reminderDelayMs = dt.diff(now, "milliseconds").milliseconds - 30 * 60 * 1000;
    const closeDelayMs = dt.diff(now, "milliseconds").milliseconds - 40 * 60 * 1000;

    console.log("🕓 Event time:", dt.toISO());
    console.log("🕒 Current time:", now.toISO());
    console.log("⏰ Reminder delay (ms):", reminderDelayMs);
    console.log("🚫 Button close delay (ms):", closeDelayMs);

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

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
    const message = await interaction.fetchReply();

    // Reminder 30 min before
    if (reminderDelayMs > 0) {
      safeTimeout(async () => {
        const responses = eventResponses.get(eventId);
        for (const userId of responses.ja) {
          try {
            const user = await interaction.client.users.fetch(userId);
            await user.send(`🔔 Påmindelse: **${title}** starter om 30 minutter: <t:${tsSec}:R>`);
          } catch (err) {
            console.error("Fejl ved afsendelse af påmindelse:", err);
          }
        }
      }, reminderDelayMs);
    } else if (dt > now) {
      const responses = eventResponses.get(eventId);
      for (const userId of responses.ja) {
        try {
          const user = await interaction.client.users.fetch(userId);
          await user.send(`🔔 Påmindelse: **${title}** starter snart: <t:${tsSec}:R>`);
        } catch (err) {
          console.error("Fejl ved afsendelse af øjeblikkelig påmindelse:", err);
        }
      }
    }

    // Disable buttons 40 min before event
    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button });
    if (closeDelayMs > 0) {
      safeTimeout(() => collector.stop(), closeDelayMs);
    } else {
      collector.stop();
    }

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("rsvp_ja").setLabel("✅ Ja").setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId("rsvp_nej").setLabel("❌ Nej").setStyle(ButtonStyle.Danger).setDisabled(true),
        new ButtonBuilder().setCustomId("rsvp_maaske").setLabel("❔ Måske").setStyle(ButtonStyle.Secondary).setDisabled(true)
      );
      try {
        await message.edit({ components: [disabledRow] });
      } catch (err) {
        console.error("Kunne ikke deaktivere RSVP-knapperne:", err);
      }
    });
  },

  async handleButton(interaction) {
    const responseType = interaction.customId.replace("rsvp_", "");
    const embed = interaction.message.embeds[0];
    if (!embed?.footer?.text)
      return interaction.reply({ content: "❌ Mangler eventId.", ephemeral: true });

    const eventId = embed.footer.text.replace("eventId:", "");
    const responses = getEventStore(interaction.client).get(eventId);
    if (!responses)
      return interaction.reply({ content: "❌ Event data findes ikke længere.", ephemeral: true });

    const userId = interaction.user.id;
    responses.ja.delete(userId);
    responses.nej.delete(userId);
    responses.måske.delete(userId);
    if (responseType === "ja") responses.ja.add(userId);
    if (responseType === "nej") responses.nej.add(userId);
    if (responseType === "maaske") responses.måske.add(userId);

    const format = (set) => (set.size ? [...set].map((id) => `<@${id}>`).join("\n") : "Ingen endnu");
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
