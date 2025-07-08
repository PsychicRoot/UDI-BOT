const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const sqlite3 = require("sqlite3").verbose();

// Set up the SQLite database
const db = new sqlite3.Database("./tempvoice.db", (err) => {
  if (err) {
    console.error("Fejl ved forbindelse til SQLite-database:", err.message);
  } else {
    console.log("Forbundet til SQLite-database.");

    // Create tables if they don't exist
    db.run(
      `CREATE TABLE IF NOT EXISTS createVoiceSettings (
                guildId TEXT PRIMARY KEY,
                channelId TEXT NOT NULL
            )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS tempChannels (
                channelId TEXT PRIMARY KEY,
                ownerId TEXT NOT NULL
            )`
    );
  }
});

module.exports = {
  name: "voiceStateUpdate",

  // Main listener for voice state updates
  async execute(oldState, newState) {
    if (!newState.channel || newState.channelId === oldState.channelId) return;

    const guildId = newState.guild.id;

    db.get(
      `SELECT channelId FROM createVoiceSettings WHERE guildId = ?`,
      [guildId],
      async (err, row) => {
        if (err) {
          console.error("Fejl ved hentning af oprettelseskanal:", err.message);
          return;
        }

        const createVoiceChannelId = row?.channelId;
        if (
          !createVoiceChannelId ||
          newState.channelId !== createVoiceChannelId
        )
          return;

        const user = newState.member;
        const guild = newState.guild;

        try {
          // Opret midlertidig voice-kanal
          const tempChannel = await guild.channels.create({
            name: `${user.user.username}'s kanal`,
            type: 2, // Voice channel
            parent: newState.channel.parent, // Match category
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                allow: [PermissionsBitField.Flags.Connect],
              },
              {
                id: user.id,
                allow: [
                  PermissionsBitField.Flags.Connect,
                  PermissionsBitField.Flags.ManageChannels,
                  PermissionsBitField.Flags.MoveMembers,
                ],
              },
            ],
          });

          // Flyt bruger til den nye kanal
          await user.voice.setChannel(tempChannel);

          // Gem kanalejer i databasen
          db.run(
            `INSERT INTO tempChannels (channelId, ownerId) VALUES (?, ?)`,
            [tempChannel.id, user.id],
            (err) => {
              if (err) {
                console.error(
                  "Fejl ved lagring af temp-kanal i database:",
                  err.message
                );
              }
            }
          );

          // Send kanal-styringsknapper
          const interfaceMessage = await tempChannel.send({
            content: `🔧 **Administrer din kanal:**`,
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(`rename_${tempChannel.id}`)
                  .setLabel("📝 Omdøb")
                  .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                  .setCustomId(`kick_${tempChannel.id}`)
                  .setLabel("🚫 Smid medlem ud")
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId(`delete_${tempChannel.id}`)
                  .setLabel("❌ Slet")
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId(`lock_${tempChannel.id}`)
                  .setLabel("🔒 Lås")
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId(`unlock_${tempChannel.id}`)
                  .setLabel("🔓 Lås op")
                  .setStyle(ButtonStyle.Success)
              ),
            ],
          });

          // Overvåg kanalen for tomhed
          const monitorChannel = setInterval(async () => {
            const fetchedChannel = await guild.channels
              .fetch(tempChannel.id)
              .catch(() => null);
            if (!fetchedChannel || fetchedChannel.members.size > 0) return;

            try {
              await fetchedChannel.delete();
              db.run(`DELETE FROM tempChannels WHERE channelId = ?`, [
                tempChannel.id,
              ]);
              await interfaceMessage.delete().catch(console.error);
              clearInterval(monitorChannel);
            } catch (err) {
              console.error("Fejl ved sletning af midlertidig kanal:", err.message);
              clearInterval(monitorChannel);
            }
          }, 5000); // Tjek hvert 5. sekund
        } catch (error) {
          console.error("Fejl ved oprettelse af midlertidig kanal:", error);
        }
      }
    );
  },

  // Button interaction logic
  async interactionCreate(interaction) {
    if (!interaction.isButton()) return;
    const [action, channelId] = interaction.customId.split("_");

    const tempChannelData = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM tempChannels WHERE channelId = ?`,
        [channelId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!tempChannelData) {
      return await interaction.reply({
        content: "Denne midlertidige kanal styres ikke af botten.",
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

    const isOwner = tempChannelData.ownerId === interaction.user.id;
    if (!isOwner) {
      return await interaction.reply({
        content: "Du er ikke ejer af denne kanal.",
        ephemeral: true,
      });
    }

    try {
      switch (action) {
        case "rename":
          const renameModal = new ModalBuilder()
            .setCustomId(`rename_modal_${channelId}`)
            .setTitle("Omdøb kanal")
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId("newChannelName")
                  .setLabel("Indtast det nye navn til din kanal:")
                  .setStyle(TextInputStyle.Short)
                  .setMinLength(1)
                  .setMaxLength(100)
                  .setRequired(true)
              )
            );
          await interaction.showModal(renameModal);
          break;

        case "kick":
          const kickModal = new ModalBuilder()
            .setCustomId(`kick_modal_${channelId}`)
            .setTitle("Smid medlem ud")
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId("memberToKick")
                  .setLabel("Nævn det medlem, der skal smides ud:")
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
              )
            );
          await interaction.showModal(kickModal);
          break;

        case "delete":
          const deleteModal = new ModalBuilder()
            .setCustomId(`delete_modal_${channelId}`)
            .setTitle("Bekræft sletning")
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId("confirmationInput")
                  .setLabel("Skriv 'SLET' for at bekræfte:")
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
              )
            );
          await interaction.showModal(deleteModal);
          break;

        case "lock":
          await tempChannel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
              Connect: false,
            }
          );
          await interaction.reply({
            content: "🔒 Kanalen er låst.",
            ephemeral: true,
          });
          break;

        case "unlock":
          await tempChannel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
              Connect: true,
            }
          );
          await interaction.reply({
            content: "🔓 Kanalen er låst op.",
            ephemeral: true,
          });
          break;

        default:
          await interaction.reply({
            content: "Ukendt handling.",
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error(`Fejl ved håndtering af handling ${action}:`, error);
      await interaction.reply({
        content: "Der opstod en fejl.",
        ephemeral: true,
      });
    }
  },

  // Modal submission handling
  async modalSubmit(interaction) {
    if (!interaction.isModalSubmit()) return;
    const [action, channelId] = interaction.customId.split("_");

    // Fetch tempChannel data
    const tempChannelData = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM tempChannels WHERE channelId = ?`,
        [channelId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

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

    const isOwner = tempChannelData.ownerId === interaction.user.id;
    if (!isOwner) {
      return await interaction.reply({
        content: "Du er ikke ejer af denne kanal.",
        ephemeral: true,
      });
    }

    try {
      switch (action) {
        case "rename_modal":
          const newChannelName =
            interaction.fields.getTextInputValue("newChannelName");
          await tempChannel.setName(newChannelName);
          await interaction.reply({
            content: `Kanalen er omdøbt til **${newChannelName}**.`,
            ephemeral: true,
          });
          break;

        case "kick_modal":
          const memberToKick =
            interaction.fields.getTextInputValue("memberToKick");
          const member = tempChannel.members.find(
            (m) =>
              `<@${m.id}>` === memberToKick ||
              m.id === memberToKick.replace(/\D/g, "")
          );

          if (!member) {
            return await interaction.reply({
              content: "Medlem ikke fundet i denne kanal.",
              ephemeral: true,
            });
          }

          await member.voice.disconnect(`Smidt ud af kanal ejer`);
          await interaction.reply({
            content: `${member} er blevet smidt ud.`,
            ephemeral: true,
          });
          break;

        case "delete_modal":
          const confirmation =
            interaction.fields.getTextInputValue("confirmationInput");
          if (confirmation !== "SLET") {
            return await interaction.reply({
              content: "Sletning afbrudt. Skriv 'SLET' for at bekræfte.",
              ephemeral: true,
            });
          }

          await tempChannel.delete();
          db.run(`DELETE FROM tempChannels WHERE channelId = ?`, [channelId]);
          await interaction.reply({
            content: "Kanalen blev slettet.",
            ephemeral: true,
          });
          break;

        default:
          await interaction.reply({
            content: "Ukendt handling.",
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error(`Fejl ved håndtering af modal-submission ${action}:`, error);
      await interaction.reply({
        content: "Der opstod en fejl.",
        ephemeral: true,
      });
    }
  },
};
