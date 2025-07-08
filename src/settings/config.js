require("dotenv").config();

module.exports = {
  OWNER_ID: process.env.OWNER_ID || "215738013597040640", //your client id
  EMBED_COLOR: process.env.EMBED_COLOR || "#000001", // embed message color!

  // Default autocomplete search
  SEARCH_DEFAULT: ["lo fi", "jvke", "post malone", "bassboost"],
  // Leave voice empty
  LEAVE_EMPTY: parseInt(process.env.LEAVE_EMPTY || "120000"), // 1000 = 1 sec

  // Spotify support playlist more 100+ track || false = default || Can get from here: https://developer.spotify.com/dashboard/applications
  SPOTIFY_TRACKS: parseBoolean(process.env.SPOTIFY_TRACKS || true),
  SPOTIFY_ID: process.env.SPOTIFY_ID || "6d79b2fe18174c1f8d2f887cfb39f930",
  SPOTIFY_SECRET: process.env.SPOTIFY_SECRET || "a4fe1b1c3a884cb7a82437ae83eeb612",
};

function parseBoolean(ask) {
  if (typeof ask === "string") {
    ask = ask.trim().toLowerCase();
  }
  switch (ask) {
    case true:
    case "true":
      return true;
    default:
      return false;
  }
}
