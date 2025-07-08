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
    db.run(`
            CREATE TABLE IF NOT EXISTS tempChannels (
                channelId TEXT PRIMARY KEY,
                ownerId TEXT NOT NULL
            )
        `);
  }
});

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
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
                    time: 30000,
                    max: 1,
                  });

                renameCollector.on("collect", async (msg) => {
                  await tempChannel.setName(msg.content);
                  await msg.reply(`✅ Kanalen er omdøbt til **${msg.content}**.`);
                });

                renameCollector.on("end", (collected) => {
                  if (!collected.size) {
                    interaction.followUp({
                      content: "⏰ Du gav ikke et navn i tide.",
                      ephemeral: true,
                    });
                  }
                });
                break;

              case "limit":
                await interaction.reply({
                  content:
                    "Angiv venligst en brugergrænse for din kanal (0 = ingen grænse).",
                  ephemeral: true,
                });

                const limitCollector =
                  interaction.channel.createMessageCollector({
                    filter: (msg) => msg.author.id === interaction.user.id,
                    time: 30000,
                    max: 1,
                  });

                limitCollector.on("collect", async (msg) => {
                  const limit = parseInt(msg.content, 10);
                  if (isNaN(limit) || limit < 0) {
                    return msg.reply(
                      "❌ Ugyldigt tal. Angiv et positivt tal eller 0 for ingen grænse."
                    );
                  }

                  await tempChannel.setUserLimit(limit);
                  await msg.reply(
                    `✅ Brugergrænse sat til **${
                      limit === 0 ? "Ingen grænse" : limit
                    }**.`
                  );
                });

                limitCollector.on("end", (collected) => {
                  if (!collected.size) {
                    interaction.followUp({
                      content: "⏰ Du gav ikke en brugergrænse i tide.",
                      ephemeral: true,
                    });
                  }
                });
                break;

              case "kick":
                await interaction.reply({
                  content: "Angiv venligst den bruger, du vil smide ud.",
                  ephemeral: true,
                });

                const kickCollector =
                  interaction.channel.createMessageCollector({
                    filter: (msg) => msg.author.id === interaction.user.id,
                    time: 30000,
                    max: 1,
                  });

                kickCollector.on("collect", async (msg) => {
                  const mentionedUser = msg.mentions.members.first();
                  if (!mentionedUser) {
                    return msg.reply("❌ Angiv venligst en gyldig bruger at smide ud.");
                  }

                  try {
                    await mentionedUser.voice.disconnect();
                    await msg.reply(
                      `✅ ${mentionedUser.user.tag} er blevet smidt ud af kanalen.`
                    );
                  } catch (err) {
                    await msg.reply(
                      `❌ Kunne ikke smide brugeren ud. ${err.message}`
                    );
                  }
                });

                kickCollector.on("end", (collected) => {
                  if (!collected.size) {
                    interaction.followUp({
                      content: "⏰ Du nævnte ikke en bruger i tide.",
                      ephemeral: true,
                    });
                  }
                });
                break;

              case "delete":
                await interaction.reply({
                  content: "✅ Din midlertidige kanal er blevet slettet.",
                });
                await tempChannel.delete();
                db.run(`DELETE FROM tempChannels WHERE channelId = ?`, [
                  channelId,
                ]);
                break;

              case "lock":
                try {
                  await tempChannel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    {
                      Connect: false,
                    }
                  );
                  await interaction.reply({
                    content: "🔒 Kanalen er nu låst.",
                    ephemeral: true,
                  });
                } catch (err) {
                  console.error("Fejl ved låsning af kanalen:", err);
                  await interaction.reply({
                    content: "❌ Kunne ikke låse kanalen.",
                    ephemeral: true,
                  });
                }
                break;

              case "unlock":
                try {
                  await tempChannel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    {
                      Connect: true,
                    }
                  );
                  await interaction.reply({
                    content: "🔓 Kanalen er nu låst op.",
                    ephemeral: true,
                  });
                } catch (err) {
                  console.error("Fejl ved oplåsning af kanalen:", err);
                  await interaction.reply({
                    content: "❌ Kunne ikke låse kanalen op.",
                    ephemeral: true,
                  });
                }
                break;

              default:
                await interaction.reply({
                  content: "Ukendt handling.",
                  ephemeral: true,
                });
            }
          }
        );
      }

      // Håndter select-menu
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "select_item") {
          const command = client.commands.get("finditem");
          if (!command) return;

          try {
            await command.handleItemSelection(interaction);
          } catch (error) {
            console.error("Fejl ved behandling af valg:", error);
            await interaction.followUp({
              content: "Der opstod en fejl under behandling af dit valg.",
              ephemeral: true,
            });
          }
        }
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "Der opstod en fejl under behandling af din anmodning.",
        ephemeral: true,
      });
    }
  },
};
