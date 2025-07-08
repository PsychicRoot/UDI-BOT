const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
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
      .setDescription("Opret en begivenhed med Ja/Nej/Måske valg")
      .addStringOption((option) =>
        option.setName("titel").setDescription("Navn på begivenheden").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("dato").setDescription("Dato for begivenheden (fx 2025-07-10)").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("tidspunkt").setDescription("Tidspunkt (fx 18:00)").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("beskrivelse").setDescription("Valgfri beskrivelse").setRequired(false)
      )
      .setContexts([GUILD]),
  
    async execute(interaction) {
      const allowedRoleId = "1388909452115054692"; // Replace with your actual role ID
      const member = interaction.member;
  
      if (!member.roles.cache.has(allowedRoleId)) {
        await interaction.reply({
          content: `❌ Du har ikke tilladelse til at bruge denne kommando.`,
          ephemeral: true,
        });
        return;
      }
  
      const title = interaction.options.getString("titel");
      const description = interaction.options.getString("beskrivelse") || "Ingen beskrivelse.";
      const dato = interaction.options.getString("dato");
      const tidspunkt = interaction.options.getString("tidspunkt");
  
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
          { name: "🗓️ Dato & Tid", value: `${dato} kl. ${tidspunkt}` },
          { name: "✅ Deltager", value: "Ingen endnu", inline: true },
          { name: "❌ Deltager ikke", value: "Ingen endnu", inline: true },
          { name: "❔ Måske", value: "Ingen endnu", inline: true }
        )
        .setColor(0x3498db)
        .setFooter({ text: `eventId:${eventId}` })
        .setTimestamp();
  
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rsvp_ja`).setLabel("✅ Ja").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`rsvp_nej`).setLabel("❌ Nej").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`rsvp_maaske`).setLabel("❔ Måske").setStyle(ButtonStyle.Secondary)
      );
  
      const message = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });
  
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 1000 * 60 * 60 * 6, // 6 timer
      });
  
      collector.on("end", () => {
        const rowDisabled = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`rsvp_ja`).setLabel("✅ Ja").setStyle(ButtonStyle.Success).setDisabled(true),
          new ButtonBuilder().setCustomId(`rsvp_nej`).setLabel("❌ Nej").setStyle(ButtonStyle.Danger).setDisabled(true),
          new ButtonBuilder().setCustomId(`rsvp_maaske`).setLabel("❔ Måske").setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
  
        message.edit({ components: [rowDisabled] });
      });
    },
  
    async handleButton(interaction) {
      const responseType = interaction.customId.replace("rsvp_", ""); // ja, nej, maaske
      const embed = interaction.message.embeds[0];
  
      if (!embed || !embed.footer || !embed.footer.text) {
        return interaction.reply({ content: "❌ Mangler eventId.", ephemeral: true });
      }
  
      const footerText = embed.footer.text;
      const eventId = footerText.replace("eventId:", "");
      const eventResponses = getEventStore(interaction.client);
      const responses = eventResponses.get(eventId);
  
      if (!responses) {
        return interaction.reply({
          content: "❌ Event data findes ikke længere eller er udløbet.",
          ephemeral: true,
        });
      }
  
      const userId = interaction.user.id;
      responses.ja.delete(userId);
      responses.nej.delete(userId);
      responses.måske.delete(userId);
  
      if (responseType === "ja") responses.ja.add(userId);
      if (responseType === "nej") responses.nej.add(userId);
      if (responseType === "maaske") responses.måske.add(userId);
  
      const formatUsers = (set) =>
        set.size ? [...set].map((id) => `<@${id}>`).join("\n") : "Ingen endnu";
  
      const updatedEmbed = EmbedBuilder.from(embed)
        .spliceFields(1, 3)
        .addFields(
          { name: "✅ Deltager", value: formatUsers(responses.ja), inline: true },
          { name: "❌ Deltager ikke", value: formatUsers(responses.nej), inline: true },
          { name: "❔ Måske", value: formatUsers(responses.måske), inline: true }
        );
  
      await interaction.update({
        embeds: [updatedEmbed],
        components: interaction.message.components,
      });
    },
  };
  