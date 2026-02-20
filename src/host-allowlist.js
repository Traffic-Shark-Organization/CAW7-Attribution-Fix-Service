const { badRequest } = require("./errors");

function parseAllowlist() {
  if (!process.env.ALLOWED_REDIRECT_HOSTS) {
    return [];
  }

  return process.env.ALLOWED_REDIRECT_HOSTS.split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function assertHostAllowed(targetUrl) {
  const allowlist = parseAllowlist();
  if (allowlist.length === 0) {
    return;
  }

  const hostname = targetUrl.hostname.toLowerCase();
  const isAllowed = allowlist.some((allowedHost) => {
    return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
  });

  if (!isAllowed) {
    throw badRequest("Redirect host is not allowed", { hostname });
  }
}

module.exports = {
  assertHostAllowed,
};
