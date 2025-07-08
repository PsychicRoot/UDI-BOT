const {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonStyle,
  TextInputStyle,
  PermissionsBitField,
} = require("discord.js");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./tempvoice.db", (err) => {
  if (err) {
    console.error("Fejl ved forbindelse til SQLite-database:", err.message);
  } else {
    console.log("Forbundet til SQLite-database.");
    db.run(\`
            CREATE TABLE IF NOT EXISTS tempChannels (
                channelId TEXT PRIMARY KEY,
                ownerId TEXT NOT NULL
            )
        \`);
  }
});

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      // Handle event modal submission
      if (interaction.isModalSubmit() && interaction.customId === "event_modal") {
        const eventCmd = client.commands.get("event");
        if (eventCmd && typeof eventCmd.handleModalSubmit === "function") {
          try {
            await eventCmd.handleModalSubmit(interaction);
          } catch (error) {
            console.error("Error handling event modal:", error);
            await interaction.reply({ content: "❌ Der opstod en fejl ved oprettelse af begivenheden.", ephemeral: true });
          }
        }
        return;
      }

      // ✅ Håndter autocomplete
      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error("Autocomplete-fejl:", error);
        }
        return;
      }

      // Håndter slash-kommandoer
      if (interaction.isChatInputCommand()) {
        const { commands } = client;
        const { commandName } = interaction;
        const command = commands.get(commandName);
        if (!command) return;

        try {
          await command.execute(interaction, client);
        } catch (error) {
          console.error(error);
          await interaction.reply({
            content: "Noget gik galt under udførelsen af denne kommando...",
            ephemeral: true,
          });
        }
        return;
      }

      // 📅 Håndter knapper fra /event kommando
      if (interaction.isButton() && interaction.customId.startsWith("rsvp_")) {
        const eventHandler = client.commands.get("event");
        if (eventHandler && typeof eventHandler.handleButton === "function") {
          try {
            await eventHandler.handleButton(interaction);
          } catch (error) {
            console.error("Fejl ved håndtering af event-knap:", error);
            await interaction.reply({
              content: "❌ Der opstod en fejl ved håndtering af din tilmelding.",
              ephemeral: true,
            });
          }
        }
        return;
      }

      // Admin-knapper (Udført / Ikke udført)
      if (
        interaction.isButton() &&
        (interaction.customId === "mark_done" ||
          interaction.customId === "mark_not_done")
      ) {
        const embed = interaction.message.embeds[0];
        const userId = embed.fields.find(
          (field) => field.name === "User ID"
        )?.value;
        const requestDescription = embed.description;
        const status =
          interaction.customId === "mark_done" ? "✅ Udført" : "❌ Ikke udført";

        const modal = new ModalBuilder()
          .setCustomId(`response_modal_${interaction.customId}`)
          .setTitle(
            status === "✅ Udført" ? "Udfør anmodning" : "Afvis anmodning"
          );

        const responseInput = new TextInputBuilder()
          .setCustomId("response_input")
          .setLabel("Indtast dit svar til brugeren:")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Angiv detaljer eller begrundelse for din beslutning...")
          .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(responseInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);

        client.once("interactionCreate", async (modalInteraction) => {
          if (
            !modalInteraction.isModalSubmit() ||
            !modalInteraction.customId.startsWith("response_modal_")
          )
            return;

          const response =
            modalInteraction.fields.getTextInputValue("response_input");

          try {
            const user = await client.users.fetch(userId);

            const responseEmbed = new EmbedBuilder()
              .setTitle("📢 Opdatering af ændringsanmodning")
              .setDescription(`**Din anmodning:** ${requestDescription}`)
              .addFields(
                { name: "Svarstatus", value: status },
                { name: "Svar:", value: response }
              )
              .setColor(status === "✅ Udført" ? 0x4caf50 : 0xff4c4c)
              .setFooter({ text: "Tak for din tilbagemelding!" })
              .setTimestamp();

            await user.send({ embeds: [responseEmbed] });

            const updatedEmbed = EmbedBuilder.from(embed)
              .setFields([
                ...embed.fields,
                { name: "Status", value: status, inline: true },
              ])
              .setColor(status === "✅ Udført" ? 0x4caf50 : 0xff4c4c);

            await modalInteraction.update({
              embeds: [updatedEmbed],
              components: [],
            });

            await modalInteraction.followUp({
              content: `Svar sendt til ${user.tag} og anmodningen markeret som ${status}.`,
              ephemeral: true,
            });
          } catch (error) {
            console.error("Fejl ved afsendelse af svar på ændringsanmodning:", error);
            await modalInteraction.reply({
              content:
                "Der opstod en fejl under afsendelse af svaret til brugeren.",
              ephemeral: true,
            });
          }
        });
        return;
      }

      // Voice channel control buttons start with: rename_, limit_, kick_, delete_, lock_, unlock_
      if (
        interaction.isButton() &&
        /^(rename|limit|kick|delete|lock|unlock)_/.test(interaction.customId)
      ) {
        const [action, channelId] = interaction.customId.split("_");

        db.get(
          `SELECT * FROM tempChannels WHERE channelId = ?`,
          [channelId],
          async (err, tempChannelData) => {
            if (err) {
              console.error("Fejl ved hentning af temp-kanaldata:", err.message);
              return;
            }

            if (!tempChannelData) {
              return await interaction.reply({
                content:
                  "Denne midlertidige kanal findes ikke længere eller styres ikke af botten.",
                ephemeral: true,
              });
            }

            const tempChannel = await interaction.guild.channels
              .fetch(channelId)
              .catch(() => null);

            if (!tempChannel) {
              return await interaction.reply({
                content: "Denne kanal findes ikke længere.",
                ephemeral: true,
              });
            }

            const userIsOwner = tempChannelData.ownerId === interaction.user.id;

            if (!userIsOwner) {
              return await interaction.reply({
                content: "Du er ikke ejer af denne kanal.",
                ephemeral: true,
              });
            }

            switch (action) {
              case "rename":
                await interaction.reply({
                  content: "Angiv venligst et nyt navn til din kanal.",
                  ephemeral: true,
                });

                const renameCollector =
                  interaction.channel.createMessageCollector({
                    filter: (msg) => msg.author.id === interaction.user.id,
                    time