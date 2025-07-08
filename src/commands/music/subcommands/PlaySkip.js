const { PermissionsBitField } = require("discord.js");
const { Database } = require("st.db");

const GSetup = new Database("src/settings/models/setup.json", {
  databaseInObject: true,
});

module.exports = {
  async playSkip(client, interaction) {
    try {
      if (interaction.options.getString("search")) {
        const db = await GSetup.get(interaction.guild.id);
        if (!db)
          return await interaction.reply({
            content: "Please make sure to run /music setup first!",
          });
        if (db.setup_enable === true)
          return await interaction.reply(
            "Command is disable already have song request channel!"
          );

        await await interaction.reply(
          `🔍 **Searching...** \`${interaction.options.getString("search")}\``
        );

        const message = await interaction.fetchReply();
        await client.createPlay(interaction, message.id);

        const { channel } = interaction.member.voice;
        if (!channel)
          return await interaction.editReply(
            "You need to be in voice channel."
          );
        if (
          !channel
            .permissionsFor(interaction.guild.members.me)
            .has(PermissionsBitField.Flags.Connect)
        )
          return await interaction.editReply(
            `I don't have perm \`CONNECT\` in ${channel.name} to join voice!`
          );
        if (
          !channel
            .permissionsFor(interaction.guild.members.me)
            .has(PermissionsBitField.Flags.Speak)
        )
          return await interaction.editReply(
            `I don't have perm \`SPEAK\` in ${channel.name} to join voice!`
          );

        try {
          const string = interaction.options.getString("search");

          const options = {
            member: interaction.member,
            textChannel: interaction.channel,
            interaction,
            skip: true,
          };

          await client.distube.play(
            interaction.member.voice.channel,
            string,
            options
          );
        } catch (e) {
          console.error(e);
        }
      }
    } catch (e) {
      console.error(e);
    }
  },
};
