const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbPath = path.resolve(__dirname, "../data/changelog_channels.db");

// Ensure the directory exists
const dirPath = path.dirname(dbPath);
if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

// Initialize the database
const db = new sqlite3.Database(dbPath);

// Create table on load
db.serialize(() => {
  db.run(`
        CREATE TABLE IF NOT EXISTS changelog_channels (
            guild_id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL
        )
    `);
});

function setChangelogChannel(guildId, channelId) {
  return new Promise((resolve, reject) => {
    const stmt = `
            INSERT INTO changelog_channels (guild_id, channel_id)
            VALUES (?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id
        `;
    db.run(stmt, [guildId, channelId], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getChangelogChannel(guildId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT channel_id FROM changelog_channels WHERE guild_id = ?`,
      [guildId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.channel_id : null);
      }
    );
  });
}

function getAllChangelogChannels() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT guild_id, channel_id FROM changelog_channels`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else {
          const map = {};
          rows.forEach((row) => (map[row.guild_id] = row.channel_id));
          resolve(map);
        }
      }
    );
  });
}

module.exports = {
  setChangelogChannel,
  getChangelogChannel,
  getAllChangelogChannels,
};
