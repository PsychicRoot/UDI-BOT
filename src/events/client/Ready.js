const { ActivityType } = require("discord-api-types/v10");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log("Client is now online!");

    // Update the bot's "About Me" section
    const aboutMeDescription =
      "UDI den nye fronteer";
    try {
      const application = await client.application.fetch(); // Fetch the bot's application info
      await application.edit({
        description: aboutMeDescription, // Update the About Me section
      });
      console.log("Updated bot's About Me section.");
    } catch (error) {
      console.error("Failed to update About Me section:", error);
    }

    // Function to calculate the total number of users across all servers
    const getTotalUsers = () => {
      return client.guilds.cache.reduce(
        (total, guild) => total + guild.memberCount,
        0
      );
    };

    let activityIndex = 0; // Keeps track of the current activity
    const getActivities = () => [
      {
        type: ActivityType.Streaming,
        name: `UDI | ${getTotalUsers()} Antal frihedskæmpere`,
        url: "https://www.twitch.tv/starcitizen", // Streaming URL
      },
      {
        type: ActivityType.Streaming,
        name: "Velkommen!",
        url: "https://www.twitch.tv/starcitizen", // Streaming URL
      },
      {
        type: ActivityType.Streaming,
        name: "Har du nogle ønsker? Brug vores /ønsker kommando!",
        url: "https://www.twitch.tv/starcitizen", // Streaming URL
      },
    ];

    // Set an interval to update the bot's status every 5 seconds
    setInterval(() => {
      const activities = getActivities(); // Re-generate activities to reflect dynamic data
      const activity = activities[activityIndex]; // Get the current activity
      client.user.setActivity(activity.name, {
        type: activity.type,
        url: activity.url, // Include the streaming URL
      });

      // Move to the next activity in the array, looping back to the start
      activityIndex = (activityIndex + 1) % activities.length;
    }, 5000); // 5000ms = 5 seconds
  },
};
