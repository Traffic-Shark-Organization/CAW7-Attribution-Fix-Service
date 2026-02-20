const { badRequest } = require("./errors");
const { assertHostAllowed } = require("./host-allowlist");

const CONTROL_QUERY_KEYS = new Set(["target", "status", "head_redirect", "await_params"]);
const ALLOWED_TARGET_PROTOCOLS = new Set(["http:", "https:"]);
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const TRUE_BOOLEAN_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_BOOLEAN_VALUES = new Set(["0", "false", "no", "off"]);

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

function parseBooleanFlag(rawFlag, parameterName, defaultValue) {
  if (rawFlag === null) {
    return defaultValue;
  }

  const normalized = rawFlag.trim().toLowerCase();
  if (TRUE_BOOLEAN_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_BOOLEAN_VALUES.has(normalized)) {
    return false;
  }

  throw badRequest(`Query parameter "${parameterName}" must be boolean: true/false/1/0`);
}

function parseHeadRedirectFlag(rawFlag) {
  return parseBooleanFlag(rawFlag, "head_redirect", false);
}

function parseAwaitParamsFlag(rawFlag) {
  return parseBooleanFlag(rawFlag, "await_params", false);
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

  if (!ALLOWED_TARGET_PROTOCOLS.has(targetUrl.protocol)) {
    throw badRequest('Only "http" and "https" target URLs are supported');
  }

  assertHostAllowed(targetUrl);
  return targetUrl;
}

function collectPassthroughQueryParams(searchParams) {
  const passthroughParams = [];

  for (const [key, value] of searchParams) {
    if (CONTROL_QUERY_KEYS.has(key)) {
      continue;
    }

    passthroughParams.push([key, value]);
  }

  return passthroughParams;
}

function appendQueryParams(targetUrl, params) {
  for (const [key, value] of params) {
    targetUrl.searchParams.append(key, value);
  }
}

function buildRedirectResult(req) {
  const requestUrl = parseRequestUrl(req);
  const targetUrl = parseTargetUrl(requestUrl.searchParams.get("target"));
  const status = parseRedirectStatus(requestUrl.searchParams.get("status"));
  const headRedirect = parseHeadRedirectFlag(requestUrl.searchParams.get("head_redirect"));
  const awaitParams = parseAwaitParamsFlag(requestUrl.searchParams.get("await_params"));
  const passthroughParams = collectPassthroughQueryParams(requestUrl.searchParams);
  const hasPassthroughParams = passthroughParams.length > 0;

  appendQueryParams(targetUrl, passthroughParams);

  return {
    status,
    headRedirect,
    awaitParams,
    hasPassthroughParams,
    redirectUrl: targetUrl.toString(),
  };
}

module.exports = {
  buildRedirectResult,
};
