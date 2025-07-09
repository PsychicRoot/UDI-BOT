module.exports = {
  async logError(functionName, error, client) {
    const atlasServerId = "1388909264327938169";
    const errorLogChannelId = "1392176970317430964";
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
