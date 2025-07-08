const { REST, Routes, EmbedBuilder } = require("discord.js");
const fs = require("fs");

module.exports = async (client) => {
  const commandFolders = fs.readdirSync("./src/commands"); // Loading the command folders
  const commandNames = [];

  // Loop through each folder and load command files
  for (const folder of commandFolders) {
    const commandFiles = fs
      .readdirSync(`./src/commands/${folder}`)
      .filter((file) => file.endsWith(".js"));

    // Load each command into client.commands collection
    for (const file of commandFiles) {
      const command = require(`../../commands/${folder}/${file}`);

      // Ensure command.data.toJSON exists
      if (command?.data?.toJSON && typeof command.data.toJSON === "function") {
        client.commands.set(command.data.name, command);
        client.commandArray.push(command.data.toJSON());
        commandNames.push(command.data.name);
      } else {
        console.warn(
          `⚠️ Skipping invalid command in file: ${file} (missing or malformed SlashCommandBuilder)`
        );
      }
    }
  }

  const clientID = "1388965456047636590"; // Ensure your actual bot client ID is used here
  const rest = new REST().setToken(process.env.token);

  try {
    console.log("Started refreshing application (/) commands.");

    // Upload new commands to Discord's API
    await rest.put(Routes.applicationCommands(clientID), {
      body: client.commandArray,
    });

    console.log("Successfully reloaded application (/) commands.");

    const channelID = "1392176970317430964"; // Specify your logging channel ID
    const channel = await client.channels.fetch(channelID);

    // Create and send the embed to log the loaded commands
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("Commands Loaded")
        .setDescription(
          "Here are the commands that have been successfully loaded:"
        )
        .addFields({
          name: "Loaded Commands",
          value: commandNames.join("\n") || "No commands loaded.",
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } else {
      console.error("Channel not found!");
    }
  } catch (error) {
    console.error("Error while reloading commands:", error);
  }
};
