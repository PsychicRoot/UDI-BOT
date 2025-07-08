const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const sqlite3 = require("sqlite3").verbose();

// Set up the SQLite database
const db = new sqlite3.Database("./tempvoice.db", (err) => {
  if (err) {
    console.error("Error connecting to SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database.");

    // Create a table for storing server-specific settings if it doesn't exist
    db.run(
      `CREATE TABLE IF NOT EXISTS createVoiceSettings (
        guildId TEXT PRIMARY KEY,
        channelId TEXT NOT NULL
      )`,
      (err) => {
        if (err) console.error("Error creating table:", err.message);
      }
    );
  }
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setcreatevoice")
    .setDescription(
      "Set the channel used for creating temporary voice channels."
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription(
          'The voice channel to use as the "Create Voice" channel.'
        )
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator), // Admin only

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");

    // Ensure the selected channel is a voice channel
    if (channel.type !== 2) {
      // Type 2 corresponds to voice channels
      return await interaction.reply({
        content: "❌ Please select a valid voice channel.",
        ephemeral: true,
      });
    }

    const guildId = interaction.guild.id;
    const channelId = channel.id;

    // Insert or update the channel ID for the guild in the database
    db.run(
      `INSERT INTO createVoiceSettings (guildId, channelId)
      VALUES (?, ?)
      ON CONFLICT(guildId) DO UPDATE SET channelId = ?`,
      [guildId, channelId, channelId],
      (err) => {
        if (err) {
          console.error("Error saving to database:", err.message);
          return interaction.reply({
            content:
              "❌ An error occurred while saving the channel to the database.",
            ephemeral: true,
          });
        }

        interaction.reply({
          content: `✅ The "Create Voice" channel has been set to <#${channelId}>.`,
          ephemeral: true,
        });
      }
    );
  },
};
