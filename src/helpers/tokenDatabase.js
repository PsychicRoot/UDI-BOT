const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./tokens.db");

// Create table if it doesn't exist
db.run(
  `CREATE TABLE IF NOT EXISTS tokens (
        guild_id TEXT PRIMARY KEY,
        token TEXT
    )`
);

// Function to set token
const setToken = (guildId, token) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO tokens (guild_id, token) VALUES (?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET token = excluded.token`,
      [guildId, token],
      (err) => {
        if (err) reject(err);
        resolve();
      }
    );
  });
};

// Function to get token
const getToken = (guildId) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT token FROM tokens WHERE guild_id = ?`,
      [guildId],
      (err, row) => {
        if (err) reject(err);
        resolve(row ? row.token : null);
      }
    );
  });
};

module.exports = { setToken, getToken };
