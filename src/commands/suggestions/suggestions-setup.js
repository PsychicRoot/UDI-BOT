const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  SelectMenuBuilder,
} = require("discord.js");
const {
  OWNERS,
  TRIAL_SUPPORT_ID,
  STAFF_ROLE_ID,
} = require("../../constants/roles");
const { PermissionFlagsBits, MessageFlags } = require("discord-api-types/v10");
const { GUILD } = require("../../constants/interactionTypes");
const { COLOR_ATLAS_LEGACY } = require("../../constants/colors");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("suggestions-setup")
    .setDescription("Setup the suggestions submission channel")
    .setContexts([GUILD])
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const memberRoles = interaction.member.roles.cache;
    if (
      !memberRoles.has(TRIAL_SUPPORT_ID) &&
      !memberRoles.has(STAFF_ROLE_ID) &&
      !OWNERS.includes(interaction.member.id)
    ) {
      return await interaction.editReply({
        content: "Who is it that is so wise and tries using these?",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!OWNERS.includes(interaction.member.id)) {
      return await interaction.editReply({
        content: "This command is exclusive to the Owners.",
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLOR_ATLAS_LEGACY)
      .setThumbnail(
        `https://cdn.discordapp.com/attachments/918546646214791231/1014759562357784636/Logo.png`
      )
      .setTitle(`Submit a Suggestion`)
      .setDescription(
        "Got an idea? Submit it here so we can have a look at it.\n" +
          "\n" +
          "To submit a suggestion select a suiting topic below."
      );

    const menu = new ActionRowBuilder().addComponents(
      new SelectMenuBuilder()
        .setCustomId("selectFromSuggestionsMenu")
        .setMaxValues(1)
        .setPlaceholder("Select a topic...")
        .addOptions(
          {
            label: "Legacy Edition",
            emoji: "<:atlas:1019311007023251566>",
            description: "GTA 5 - Legacy Edition",
            value: "Legacy",
          },
          {
            label: "Enhanced Edition",
            emoji: "<a:AtlasEnchanted:1360623665862934732>",
            description: "GTA 5 - Enhanced Edition",
            value: "Enhanced",
          },
          {
            label: "CS2",
            emoji: "<:cs2:1360603941985059058>",
            description: "Counter Strike 2",
            value: "CS2",
          },
          {
            label: "Atlas Launcher",
            emoji: "🚀",
            description: "Atlas Launcher suggestion",
            value: "Launcher",
          },
          {
            label: "Website",
            emoji: "💻",
            description: "Website suggestion",
            value: "Website",
          },
          {
            label: "Discord",
            emoji: "🔗",
            description: "Discord suggestion",
            value: "Discord",
          }
        )
    );

    const channel = client.channels.cache.get("1360178388123258910");

    await channel.send({ embeds: [embed], components: [menu] });
    await interaction.editReply({
      content: `Your suggestions system has been setup in ${channel}`,
    });
  },
};
