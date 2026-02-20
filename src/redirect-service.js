const { badRequest } = require("./errors");

const RESERVED_QUERY_KEYS = new Set(["target", "status", "head_redirect"]);
const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const TRUE_BOOLEAN_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_BOOLEAN_VALUES = new Set(["0", "false", "no", "off"]);

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

function parseRedirectStatus(rawStatus) {
  if (rawStatus === null) {
    return 302;
  }

  const parsedStatus = Number(rawStatus);
  const isValid = Number.isInteger(parsedStatus) && REDIRECT_STATUS_CODES.has(parsedStatus);

  if (!isValid) {
    throw badRequest('Query parameter "status" must be one of: 301, 302, 303, 307, 308');
  }

  return parsedStatus;
}

function parseHeadRedirectFlag(rawFlag) {
  if (rawFlag === null) {
    return false;
  }

  const normalized = rawFlag.trim().toLowerCase();
  if (TRUE_BOOLEAN_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_BOOLEAN_VALUES.has(normalized)) {
    return false;
  }

  throw badRequest('Query parameter "head_redirect" must be boolean: true/false/1/0');
}

function parseRequestUrl(req) {
  const host = req.get("host");

  if (!host) {
    throw badRequest("Host header is required");
  }

  return new URL(req.originalUrl, `${req.protocol}://${host}`);
}

function parseTargetUrl(rawTarget) {
  if (!rawTarget) {
    throw badRequest('Query parameter "target" is required');
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawTarget);
  } catch {
    throw badRequest('Query parameter "target" must be a valid absolute URL');
  }

  if (!SUPPORTED_PROTOCOLS.has(targetUrl.protocol)) {
    throw badRequest('Only "http" and "https" target URLs are supported');
  }

  assertHostAllowed(targetUrl);
  return targetUrl;
}

function buildRedirectResult(req) {
  const requestUrl = parseRequestUrl(req);
  const targetUrl = parseTargetUrl(requestUrl.searchParams.get("target"));
  const status = parseRedirectStatus(requestUrl.searchParams.get("status"));
  const headRedirect = parseHeadRedirectFlag(requestUrl.searchParams.get("head_redirect"));

  for (const [key, value] of requestUrl.searchParams) {
    if (RESERVED_QUERY_KEYS.has(key)) {
      continue;
    }

    targetUrl.searchParams.append(key, value);
  }

  return {
    status,
    headRedirect,
    redirectUrl: targetUrl.toString(),
  };
}

module.exports = {
  buildRedirectResult,
};
