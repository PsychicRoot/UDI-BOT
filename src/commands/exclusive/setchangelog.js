// commands/tools/setchangelog.js
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { setChangelogChannel } = require("../../helpers/changelogDatabase");

const OWNER_ID = "215738013597040640"; // Your ID

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setchangelog")
    .setDescription(
      "Set the channel where changelogs will be automatically posted."
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Select the channel for changelogs")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    // Allow if user is the owner or has required permission
    if (
      interaction.user.id !== OWNER_ID &&
      !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
    ) {
      return await interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel("channel");

    try {
      await setChangelogChannel(interaction.guild.id, channel.id);
      await interaction.reply({
        content: `✅ Changelog channel has been set to ${channel.toString()}`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("Error setting changelog channel:", err);
      await interaction.reply({
        content: "❌ Failed to set changelog channel. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
