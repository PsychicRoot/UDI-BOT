module.exports = {
  async logError(functionName, error, client) {
    const atlasServerId = "1098634387127537816";
    const errorLogChannelId = "1308911282660970516";
    const errorChannel = await client.guilds.cache
      .get(atlasServerId)
      .channels.cache.get(errorLogChannelId);

    await errorChannel.send({
      content: `[**ERROR** - __${functionName}__ - ${new Date().toLocaleString()}]: \t${
        error.stack
      }`,
    });
  },
};
