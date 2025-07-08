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
    console.error("Error connecting to SQLite database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
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
      // ✅ Handle autocomplete
      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error("❌ Autocomplete error:", error);
        }
        return;
      }

      // Handle slash commands
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
            content: "Something went wrong while executing this command...",
            ephemeral: true,
          });
        }
        return;
      }

      // Admin buttons (Done / Not Done)
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
          interaction.customId === "mark_done" ? "✅ Done" : "❌ Not Done";

        const modal = new ModalBuilder()
          .setCustomId(`response_modal_${interaction.customId}`)
          .setTitle(
            status === "✅ Done" ? "Complete Request" : "Decline Request"
          );

        const responseInput = new TextInputBuilder()
          .setCustomId("response_input")
          .setLabel("Enter your response to the user:")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Provide details or reasoning for your decision...")
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
              .setTitle("📢 Change Request Update")
              .setDescription(`**Your request:** ${requestDescription}`)
              .addFields(
                { name: "Response Status", value: status },
                { name: "Response:", value: response }
              )
              .setColor(status === "✅ Done" ? 0x4caf50 : 0xff4c4c)
              .setFooter({ text: "Thank you for your feedback!" })
              .setTimestamp();

            await user.send({ embeds: [responseEmbed] });

            const updatedEmbed = EmbedBuilder.from(embed)
              .setFields([
                ...embed.fields,
                { name: "Status", value: status, inline: true },
              ])
              .setColor(status === "✅ Done" ? 0x4caf50 : 0xff4c4c);

            await modalInteraction.update({
              embeds: [updatedEmbed],
              components: [],
            });

            await modalInteraction.followUp({
              content: `Response successfully sent to ${user.tag} and request marked as ${status}.`,
              ephemeral: true,
            });
          } catch (error) {
            console.error("Error responding to change request:", error);
            await modalInteraction.reply({
              content:
                "An error occurred while sending the response to the user.",
              ephemeral: true,
            });
          }
        });
        return;
      }

      // Temporary voice channel buttons
      if (interaction.isButton() && !interaction.customId.startsWith("s")) {
        const [action, channelId] = interaction.customId.split("_");

        db.get(
          `SELECT * FROM tempChannels WHERE channelId = ?`,
          [channelId],
          async (err, tempChannelData) => {
            if (err) {
              console.error("Error fetching temp channel data:", err.message);
              return;
            }

            if (!tempChannelData) {
              return await interaction.reply({
                content:
                  "This temporary channel no longer exists or is not managed by the bot.",
                ephemeral: true,
              });
            }

            const tempChannel = await interaction.guild.channels
              .fetch(channelId)
              .catch(() => null);

            if (!tempChannel) {
              return await interaction.reply({
                content: "This channel no longer exists.",
                ephemeral: true,
              });
            }

            const userIsOwner = tempChannelData.ownerId === interaction.user.id;

            if (!userIsOwner) {
              return await interaction.reply({
                content: "You are not the owner of this channel.",
                ephemeral: true,
              });
            }

            switch (action) {
              case "rename":
                await interaction.reply({
                  content: "Please provide a new name for your channel.",
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
                  await msg.reply(`✅ Channel renamed to **${msg.content}**.`);
                });

                renameCollector.on("end", (collected) => {
                  if (!collected.size) {
                    interaction.followUp({
                      content: "⏰ You did not provide a name in time.",
                      ephemeral: true,
                    });
                  }
                });
                break;

              case "limit":
                await interaction.reply({
                  content:
                    "Please provide a user limit for your channel (0 = no limit).",
                  ephemeral: true,
                });

                const limitCollector =
                  await interaction.channel.createMessageCollector({
                    filter: (msg) => msg.author.id === interaction.user.id,
                    time: 30000,
                    max: 1,
                  });

                limitCollector.on("collect", async (msg) => {
                  const limit = parseInt(msg.content, 10);
                  if (isNaN(limit) || limit < 0) {
                    return msg.reply(
                      "❌ Invalid number. Please provide a positive number or 0 for no limit."
                    );
                  }

                  await tempChannel.setUserLimit(limit);
                  await msg.reply(
                    `✅ User limit set to **${
                      limit === 0 ? "No Limit" : limit
                    }**.`
                  );
                });

                limitCollector.on("end", (collected) => {
                  if (!collected.size) {
                    interaction.followUp({
                      content: "⏰ You did not provide a user limit in time.",
                      ephemeral: true,
                    });
                  }
                });
                break;

              case "kick":
                await interaction.reply({
                  content: "Please mention the user you want to kick.",
                  ephemeral: true,
                });

                const kickCollector =
                  await interaction.channel.createMessageCollector({
                    filter: (msg) => msg.author.id === interaction.user.id,
                    time: 30000,
                    max: 1,
                  });

                kickCollector.on("collect", async (msg) => {
                  const mentionedUser = msg.mentions.members.first();
                  if (!mentionedUser) {
                    return msg.reply("❌ Please mention a valid user to kick.");
                  }

                  try {
                    await mentionedUser.voice.disconnect();
                    await msg.reply(
                      `✅ ${mentionedUser.user.tag} has been kicked from the channel.`
                    );
                  } catch (err) {
                    await msg.reply(
                      `❌ Failed to kick the user. ${err.message}`
                    );
                  }
                });

                kickCollector.on("end", (collected) => {
                  if (!collected.size) {
                    interaction.followUp({
                      content: "⏰ You did not mention a user in time.",
                      ephemeral: true,
                    });
                  }
                });
                break;

              case "delete":
                await interaction.reply(
                  "✅ Your temporary channel has been deleted."
                );
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
                    content: "🔒 The channel is now locked.",
                    ephemeral: true,
                  });
                } catch (err) {
                  console.error("Error locking the channel:", err);
                  await interaction.reply({
                    content: "❌ Failed to lock the channel.",
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
                    content: "🔓 The channel is now unlocked.",
                    ephemeral: true,
                  });
                } catch (err) {
                  console.error("Error unlocking the channel:", err);
                  await interaction.reply({
                    content: "❌ Failed to unlock the channel.",
                    ephemeral: true,
                  });
                }
                break;

              default:
                await interaction.reply({
                  content: "Unknown action.",
                  ephemeral: true,
                });
            }
          }
        );
      }

      // Handle select menu
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "select_item") {
          const command = client.commands.get("finditem");
          if (!command) return;

          try {
            await command.handleItemSelection(interaction);
          } catch (error) {
            console.error("Error handling item selection:", error);
            await interaction.followUp({
              content: "An error occurred while processing your selection.",
              ephemeral: true,
            });
          }
        }
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "An error occurred while processing your request.",
        ephemeral: true,
      });
    }
  },
};
