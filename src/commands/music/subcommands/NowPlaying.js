const { EmbedBuilder } = require("discord.js");
const { Database } = require("st.db");
const { MessageFlags } = require("discord-api-types/v10");

const GSetup = new Database("src/settings/models/setup.json", {
  databaseInObject: true,
});

module.exports = {
  async nowPlaying(client, interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const db = await GSetup.get(interaction.guild.id);
    if (!db)
      return await interaction.reply({
        content: "Please make sure to run /music setup first!",
      });
    if (db.setup_enable === true)
      return await interaction.editReply(
        "Command is disable already have song request channel!"
      );

    const queue = client.distube.getQueue(interaction);
    if (!queue)
      return await interaction.editReply(
        `There is nothing in the queue right now!`
      );
    const { channel } = interaction.member.voice;
    if (
      !channel ||
      interaction.member.voice.channel !==
        interaction.guild.members.me.voice.channel
    )
      return await interaction.editReply(
        "You need to be in a same/voice channel."
      );

    const uni = `${queue.songs[0].playing ? "⏸️ |" : "🔴 |"}`;
    const part = Math.floor((queue.currentTime / queue.songs[0].duration) * 30);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: queue.songs[0].playing ? "Song Pause..." : "Now Playing...",
        iconURL: "https://cdn.discordapp.com/emojis/741605543046807626.gif",
      })
      .setColor(0xa3021f)
      .setDescription(`**[${queue.songs[0].name}](${queue.songs[0].url})**`)
      .setThumbnail(
        `${queue.songs[0].thumbnail || client.user.displayAvatarURL()}`
      )
      .addFields({
        name: "Uploader:",
        value: `[${queue.songs[0].uploader.name || "Anonymous"}](${
          queue.songs[0].uploader.url || "https://www.github.com/Adivise"
        })`,
        inline: true,
      })
      .addFields({
        name: "Requester:",
        value: `${queue.songs[0].user}`,
        inline: true,
      })
      .addFields({ name: "Volume:", value: `${queue.volume}%`, inline: true })
      .addFields({
        name: "Views",
        value: `${queue.songs[0].views || "0"}`,
        inline: true,
      })
      .addFields({
        name: "Likes:",
        value: `${queue.songs[0].likes || "0"}`,
        inline: true,
      })
      .addFields({
        name: "Filters:",
        value: `${queue.filters.names.join(", ") || "Normal"}`,
        inline: true,
      })
      .setTimestamp();
    if (!part == "Infinity") {
      embed.addFields({
        name: `Current Duration: \`[${queue.formattedCurrentTime} / ${queue.songs[0].formattedDuration}]\``,
        value: `\`\`\`${uni} ${
          "─".repeat(part) + "🎶" + "─".repeat(30 - part)
        }\`\`\``,
        inline: false,
      });
    } else {
      embed.addFields({
        name: `Current Duration: \`[0:00 / ${queue.songs[0].formattedDuration}]\``,
        value: `\`\`\`🔴 | 🎶──────────────────────────────\`\`\``,
        inline: false,
      });
    }
    await interaction.editReply({ embeds: [embed] });
  },
};
