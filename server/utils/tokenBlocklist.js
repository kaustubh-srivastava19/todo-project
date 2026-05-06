const blocklist = new Set();

// optional: store expiry times for cleanup
const expiryMap = new Map();

const addToBlocklist = (token, ttlSeconds = 3600) => {
  blocklist.add(token);

  // store expiry for cleanup
  const expiresAt = Date.now() + ttlSeconds * 1000;
  expiryMap.set(token, expiresAt);
};

const isBlocked = (token) => {
  return blocklist.has(token);
};

// cleanup expired tokens (run periodically)
const cleanup = () => {
  const now = Date.now();
  for (const [token, expiry] of expiryMap.entries()) {
    if (expiry < now) {
      blocklist.delete(token);
      expiryMap.delete(token);
    }
  }
};

// run cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

module.exports = {
  addToBlocklist,
  isBlocked
};