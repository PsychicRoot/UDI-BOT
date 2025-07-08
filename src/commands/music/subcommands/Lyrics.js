const lyricsfinder = require("lyrics-finder");
const { EmbedBuilder } = require("discord.js");
const { MessageFlags } = require("discord-api-types/v10");

module.exports = {
  async lyric(client, interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let song = interaction.options.getString("song");

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

    let csong = queue.songs[0];
    if (!song && csong) song = csong.name;

    let lyrics = null;

    try {
      lyrics = await lyricsfinder(song, "");
      if (!lyrics)
        return await interaction.editReply(
          "Couldn't find any lyrics for that song!"
        );
    } catch (err) {
      console.log(err);
      return await interaction.editReply(
        "Couldn't find any lyrics for that song!"
      );
    }
    let lyricsEmbed = new EmbedBuilder()
      .setColor(0xa3021f)
      .setTitle(`Lyrics`)
      .setDescription(`**${song}**\n${lyrics}`)
      .setFooter({ text: `Requested by ${interaction.author.username}` })
      .setTimestamp();

    if (lyrics.length > 2048) {
      lyricsEmbed.setDescription("Lyrics too long to display!");
    }

    await interaction.editReply({ embeds: [lyricsEmbed] }).then((msg) => {
      var total = queue.songs[0].duration * 1000;
      var current = queue.currentTime * 1000;
      let time = total - current;
      setTimeout(() => {
        msg.delete();
      }, time);
    });
  },
};
