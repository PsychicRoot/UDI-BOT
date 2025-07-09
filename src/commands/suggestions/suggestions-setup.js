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
    .setName("Ønskebrønd")
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
        `https://robertsspaceindustries.com/media/fp4h0bym118mxr/logo/UNITDANES-Logo.png`
      )
      .setTitle(`Afgiv et ønske`)
      .setDescription(
        "har du en ide til os? Noget som du måske kunne tænke dig og se?.\n" +
          "\n" +
          "Vælg det emne du vil give et ønske til og udfyld fomularen."
      );

    const menu = new ActionRowBuilder().addComponents(
      new SelectMenuBuilder()
        .setCustomId("selectFromSuggestionsMenu")
        .setMaxValues(1)
        .setPlaceholder("Vælg et emne...")
        .addOptions(
          {
            label: "Generalle ting",
            emoji: "🔗",
            description: "Alt",
            value: "Legacy",
          },
          {
            label: "Discord",
            emoji: "🔗",
            description: "Discord suggestion",
            value: "Discord",
          }
        )
    );

    const channel = client.channels.cache.get("1392573031959887892");

    await channel.send({ embeds: [embed], components: [menu] });
    await interaction.editReply({
      content: `Your suggestions system has been setup in ${channel}`,
    });
  },
};
