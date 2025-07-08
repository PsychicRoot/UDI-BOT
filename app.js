// Discord and dependencies
const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} = require("discord.js");
require("dotenv").config();
const fs = require("fs");

// Music plugins
const { DisTube } = require("distube");
const { SoundCloudPlugin } = require("@distube/soundcloud");
const { SpotifyPlugin } = require("@distube/spotify");
const { DeezerPlugin } = require("@distube/deezer");
const { YouTubePlugin } = require("@distube/youtube");
const { DirectLinkPlugin } = require("@distube/direct-link");
const { YtDlpPlugin } = require("@distube/yt-dlp");
const { AppleMusicPlugin } = require("distube-apple-music");
const { TidalPlugin } = require("distube-tidal");

// Discord client setup
const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();
client.commandArray = [];

// DisTube setup
client.distube = new DisTube(client, {
  savePreviousSongs: true,
  emitAddListWhenCreatingQueue: true,
  emitAddSongWhenCreatingQueue: true,
  plugins: [
    new YtDlpPlugin({ update: false }),
    // new SoundCloudPlugin(),
    new SpotifyPlugin(),
    new DeezerPlugin(),
    new YouTubePlugin(),
    new DirectLinkPlugin(),
    new AppleMusicPlugin(),
    new TidalPlugin(),
  ],
});

["loadPlayer", "loadDatabase"].forEach((x) =>
  require(`./src/handlers/${x}`)(client)
);

if (fs.existsSync("./src/functions")) {
  const functionFolders = fs.readdirSync("./src/functions");
  for (const folder of functionFolders) {
    const functionFiles = fs
      .readdirSync(`./src/functions/${folder}`)
      .filter((file) => file.endsWith(".js"));
    for (const file of functionFiles)
      require(`./src/functions/${folder}/${file}`)(client);
  }
}

// Event and command handling
if (client.handleEvents) client.handleEvents();
client.on("ready", async () => {
  try {
    console.log(`Logged in as ${client.user.tag}`);
    if (client.handleCommands) await client.handleCommands();
    console.log("Commands have been successfully loaded!");
  } catch (error) {
    console.error("Error while loading commands:", error);
  }
});

// Start the bot
client.login(process.env.token);
