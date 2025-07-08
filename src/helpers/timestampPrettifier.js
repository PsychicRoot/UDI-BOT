module.exports = {
  timestampPrettifier(lastReset) {
    const days = Math.floor(lastReset / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (lastReset % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((lastReset % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((lastReset % (1000 * 60)) / 1000);

    let lastResetString = "";
    if (days > 0) {
      lastResetString += `${days} day${days > 1 ? "s" : ""} `;
    }
    if (hours > 0) {
      lastResetString += `${hours} hour${hours > 1 ? "s" : ""} `;
    }
    if (minutes > 0) {
      lastResetString += `${minutes} minute${minutes > 1 ? "s" : ""} `;
    }
    if (seconds > 0) {
      lastResetString += `${seconds} second${seconds > 1 ? "s" : ""}`;
    }
    return lastResetString;
  },
};
