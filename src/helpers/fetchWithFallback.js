const axios = require("axios");

async function fetchWithFallback(url, primaryToken, backupToken) {
  try {
    // Try with the primary token
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${primaryToken}` },
    });
    return response.data;
  } catch (error) {
    if (
      error.response &&
      (error.response.status === 429 || error.response.status === 401)
    ) {
      console.warn("Primary token failed. Switching to backup token...");
      try {
        // Try with the backup token
        const backupResponse = await axios.get(url, {
          headers: { Authorization: `Bearer ${backupToken}` },
        });
        return backupResponse.data;
      } catch (backupError) {
        console.error("Backup token also failed:", backupError);
        throw new Error("Both tokens failed.");
      }
    } else {
      console.error("Primary request failed:", error);
      throw new Error(
        "Request failed for reasons other than rate limiting or authentication."
      );
    }
  }
}

module.exports = { fetchWithFallback };
