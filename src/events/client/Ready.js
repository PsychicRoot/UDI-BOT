const { ActivityType } = require("discord-api-types/v10");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log("Client is now online!");

    // Update the bot's "About Me" section
    const aboutMeDescription =
      "Hobo Utilities is a versatile Star Citizen bot designed to streamline gameplay by leveraging API integrations to fetch and generate real-time data. Currently under active development, it requires minimal setup to customize for your server's needs.";
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
        name: `Hobos | ${getTotalUsers()} Total Users`,
        url: "https://www.twitch.tv/starcitizen", // Streaming URL
      },
      {
        type: ActivityType.Streaming,
        name: `Part of ${client.guilds.cache.size} servers`,
        url: "https://www.twitch.tv/starcitizen", // Streaming URL
      },
      {
        type: ActivityType.Streaming,
        name: "Currently in test phase!",
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
