const { SlashCommandBuilder } = require("discord.js");
const { autoplay } = require("./subcommands/Autoplay");
const { clearQueue } = require("./subcommands/ClearQueue");
const { forward } = require("./subcommands/Forward");
const { join } = require("./subcommands/Join");
const { leave } = require("./subcommands/Leave");
const { loop } = require("./subcommands/Loop");
const { loopQueue } = require("./subcommands/LoopQueue");
const { lyric } = require("./subcommands/Lyrics");
const { move } = require("./subcommands/Move");
const { nowPlaying } = require("./subcommands/NowPlaying");
const { pause } = require("./subcommands/Pause");
const { play } = require("./subcommands/Play");
const { playSkip } = require("./subcommands/PlaySkip");
const { previous } = require("./subcommands/Previous");
const { queue } = require("./subcommands/Queue");
const { remove } = require("./subcommands/Remove");
const { replay } = require("./subcommands/Replay");
const { resume } = require("./subcommands/Resume");
const { search } = require("./subcommands/Search");
const { searchSkip } = require("./subcommands/SearchSkip");
const { shuffle } = require("./subcommands/Shuffle");
const { skip } = require("./subcommands/Skip");
const { skipTo } = require("./subcommands/Skipto");
const { volume } = require("./subcommands/Volume");
const { setup } = require("./subcommands/Setup");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Have the bot play music.")
    .addSubcommand((option) =>
      option
        .setName("autoplay")
        .setDescription("Toggle autoplay music in guild.")
    )
    .addSubcommand((option) =>
      option.setName("clearqueue").setDescription("Clear song in queue!")
    )
    .addSubcommand((option) =>
      option
        .setName("forward")
        .setDescription("Forward timestamp in the song!")
        .addIntegerOption((option) =>
          option
            .setName("seconds")
            .setDescription(
              "The number of seconds to forward the timestamp by."
            )
            .setRequired(false)
        )
    )
    .addSubcommand((option) =>
      option
        .setName("join")
        .setDescription("Make the bot join the voice channel.")
    )
    .addSubcommand((option) =>
      option
        .setName("leave")
        .setDescription("Make the bot leave the voice channel.")
    )
    .addSubcommand((option) =>
      option.setName("loop").setDescription("Loop current song.")
    )
    .addSubcommand((option) =>
      option.setName("loopqueue").setDescription("Loop all songs in queue.")
    )
    .addSubcommand((option) =>
      option
        .setName("lyric")
        .setDescription("Display lyrics of a song.")
        .addStringOption((option) =>
          option
            .setName("song")
            .setDescription("The song you want to find lyrics for")
            .setRequired(false)
        )
    )
    .addSubcommand((option) =>
      option
        .setName("move")
        .setDescription("Move the position of a song in the queue!")
        .addIntegerOption((option) =>
          option
            .setName("queue")
            .setDescription("The queue of the song")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("position")
            .setDescription("The position in queue you want it to move to.")
            .setRequired(true)
        )
    )
    .addSubcommand((option) =>
      option
        .setName("nowplaying")
        .setDescription("Display the song currently playing.")
    )
    .addSubcommand((option) =>
      option.setName("pause").setDescription("Pause the music.")
    )
    .addSubcommand((option) =>
      option
        .setName("play")
        .setDescription("Play a song from a source.")
        .addStringOption((option) =>
          option
            .setName("search")
            .setDescription("The song to play")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((option) =>
      option
        .setName("playskip")
        .setDescription("Play and skip to a song!")
        .addStringOption((option) =>
          option
            .setName("search")
            .setDescription("The song to play.")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((option) =>
      option
        .setName("previous")
        .setDescription("Play the previous song in the queue.")
    )
    .addSubcommand((option) =>
      option
        .setName("queue")
        .setDescription("Show the queue of songs.")
        .addIntegerOption((option) =>
          option
            .setName("page")
            .setDescription("Page number to show.")
            .setRequired(false)
        )
    )
    .addSubcommand((option) =>
      option
        .setName("remove")
        .setDescription("Remove a song from the queue!")
        .addIntegerOption((option) =>
          option
            .setName("position")
            .setDescription("The position in queue you want to remove.")
            .setRequired(true)
        )
    )
    .addSubcommand((option) =>
      option.setName("replay").setDescription("Replay the current song.")
    )
    .addSubcommand((option) =>
      option.setName("resume").setDescription("Resume the music.")
    )
    .addSubcommand((option) =>
      option
        .setName("search")
        .setDescription("Search a song and play music.")
        .addStringOption((option) =>
          option
            .setName("search")
            .setDescription("The song to play.")
            .setRequired(true)
        )
    )
    .addSubcommand((option) =>
      option
        .setName("searchskip")
        .setDescription("Search and skip to a song.")
        .addStringOption((option) =>
          option
            .setName("search")
            .setDescription("The song to play.")
            .setRequired(true)
        )
    )
    .addSubcommand((option) =>
      option.setName("setup").setDescription("Setup channel song request.")
    )
    .addSubcommand((option) =>
      option
        .setName("shuffle")
        .setDescription("Shuffle the songs in the queue.")
    )
    .addSubcommand((option) =>
      option.setName("skip").setDescription("Skip the current song.")
    )
    .addSubcommand((option) =>
      option
        .setName("skipto")
        .setDescription("Skips to a certain song in the queue.")
        .addIntegerOption((option) =>
          option
            .setName("position")
            .setDescription("The position of the song in the queue.")
            .setRequired(true)
        )
    )
    .addSubcommand((option) =>
      option
        .setName("volume")
        .setDescription("Adjust the volume of the bot.")
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The amount of volume to set the bot to.")
            .setRequired(false)
        )
    ),

  async execute(interaction, client) {
    try {
      const subcommand = interaction.options.getSubcommand();
      if (subcommand === "autoplay") await autoplay(client, interaction);
      else if (subcommand === "clearqueue")
        await clearQueue(client, interaction);
      else if (subcommand === "forward") await forward(client, interaction);
      else if (subcommand === "join") await join(client, interaction);
      else if (subcommand === "leave") await leave(client, interaction);
      else if (subcommand === "loop") await loop(client, interaction);
      else if (subcommand === "loopqueue") await loopQueue(client, interaction);
      else if (subcommand === "lyric") await lyric(client, interaction);
      else if (subcommand === "move") await move(client, interaction);
      else if (subcommand === "nowplaying")
        await nowPlaying(client, interaction);
      else if (subcommand === "pause") await pause(client, interaction);
      else if (subcommand === "play") await play(client, interaction);
      else if (subcommand === "playskip") await playSkip(client, interaction);
      else if (subcommand === "previous") await previous(client, interaction);
      else if (subcommand === "queue") await queue(client, interaction);
      else if (subcommand === "remove") await remove(client, interaction);
      else if (subcommand === "replay") await replay(client, interaction);
      else if (subcommand === "resume") await resume(client, interaction);
      else if (subcommand === "search") await search(client, interaction);
      else if (subcommand === "searchSkip")
        await searchSkip(client, interaction);
      else if (subcommand === "setup") await setup(client, interaction);
      else if (subcommand === "shuffle") await shuffle(client, interaction);
      else if (subcommand === "skip") await skip(client, interaction);
      else if (subcommand === "skipto") await skipTo(client, interaction);
      else if (subcommand === "volume") await volume(client, interaction);
    } catch (e) {
      console.error(e);
    }
  },
};
