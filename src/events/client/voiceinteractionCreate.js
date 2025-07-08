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
    console.error("Error connecting to SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database.");

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
          console.error("Error fetching Create Voice channel:", err.message);
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
          // Create a temporary voice channel
          const tempChannel = await guild.channels.create({
            name: `${user.user.username}'s Channel`,
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

          // Move user to the new channel
          await user.voice.setChannel(tempChannel);

          // Save the temporary channel's owner in the database
          db.run(
            `INSERT INTO tempChannels (channelId, ownerId) VALUES (?, ?)`,
            [tempChannel.id, user.id],
            (err) => {
              if (err) {
                console.error(
                  "Error saving temp channel to database:",
                  err.message
                );
              }
            }
          );

          // Send channel management buttons
          const interfaceMessage = await tempChannel.send({
            content: `🔧 **Manage your channel:**`,
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(`rename_${tempChannel.id}`)
                  .setLabel("📝 Rename")
                  .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                  .setCustomId(`kick_${tempChannel.id}`)
                  .setLabel("🚫 Kick Member")
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId(`delete_${tempChannel.id}`)
                  .setLabel("❌ Delete")
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId(`lock_${tempChannel.id}`)
                  .setLabel("🔒 Lock")
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId(`unlock_${tempChannel.id}`)
                  .setLabel("🔓 Unlock")
                  .setStyle(ButtonStyle.Success)
              ),
            ],
          });

          // Monitor the channel for emptiness
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
              console.error("Error deleting temporary channel:", err.message);
              clearInterval(monitorChannel);
            }
          }, 500); // Check every 5 seconds
        } catch (error) {
          console.error("Error creating temporary channel:", error);
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
        content: "This temporary channel is not managed by the bot.",
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

    const isOwner = tempChannelData.ownerId === interaction.user.id;
    if (!isOwner) {
      return await interaction.reply({
        content: "You are not the owner of this channel.",
        ephemeral: true,
      });
    }

    try {
      switch (action) {
        case "rename":
          const renameModal = new ModalBuilder()
            .setCustomId(`rename_modal_${channelId}`)
            .setTitle("Rename Channel")
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId("newChannelName")
                  .setLabel("Enter the new name for your channel:")
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
            .setTitle("Kick Member")
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId("memberToKick")
                  .setLabel("Mention the member to kick:")
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
              )
            );
          await interaction.showModal(kickModal);
          break;

        case "delete":
          const deleteModal = new ModalBuilder()
            .setCustomId(`delete_modal_${channelId}`)
            .setTitle("Confirm Deletion")
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId("confirmationInput")
                  .setLabel("Type 'DELETE' to confirm:")
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
            content: "🔒 Channel locked.",
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
            content: "🔓 Channel unlocked.",
            ephemeral: true,
          });
          break;

        default:
          await interaction.reply({
            content: "Unknown action.",
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error(`Error handling action ${action}:`, error);
      await interaction.reply({
        content: "An error occurred.",
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

    const isOwner = tempChannelData.ownerId === interaction.user.id;
    if (!isOwner) {
      return await interaction.reply({
        content: "You are not the owner of this channel.",
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
            content: `Channel renamed to **${newChannelName}**.`,
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
              content: "Member not found in this channel.",
              ephemeral: true,
            });
          }

          await member.voice.disconnect(`Kicked by channel owner`);
          await interaction.reply({
            content: `${member} has been kicked.`,
            ephemeral: true,
          });
          break;

        case "delete_modal":
          const confirmation =
            interaction.fields.getTextInputValue("confirmationInput");
          if (confirmation !== "DELETE") {
            return await interaction.reply({
              content: "Deletion canceled. Type 'DELETE' to confirm.",
              ephemeral: true,
            });
          }

          await tempChannel.delete();
          db.run(`DELETE FROM tempChannels WHERE channelId = ?`, [channelId]);
          await interaction.reply({
            content: "Channel deleted successfully.",
            ephemeral: true,
          });
          break;

        default:
          await interaction.reply({
            content: "Unknown action.",
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error(`Error handling modal submission ${action}:`, error);
      await interaction.reply({
        content: "An error occurred.",
        ephemeral: true,
      });
    }
  },
};
