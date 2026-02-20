const express = require("express");

const { HttpError } = require("./errors");
const { buildRedirectResult } = require("./redirect-service");

const app = express();
app.disable("x-powered-by");

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

function shouldAwaitParams(redirectResult) {
  return redirectResult.awaitParams && !redirectResult.hasPassthroughParams;
}

app.head("/redirect", (req, res, next) => {
  try {
    const redirectResult = buildRedirectResult(req);
    const { status, headRedirect, redirectUrl } = redirectResult;
    res.set("Cache-Control", "no-store");

    if (shouldAwaitParams(redirectResult)) {
      res.set("X-Redirect-URL", redirectUrl);
      res.set("X-Redirect-Status", "awaiting-params");
      res.status(200).end();
      return;
    }

    if (headRedirect) {
      res.redirect(status, redirectUrl);
      return;
    }

    res.set("X-Redirect-URL", redirectUrl);
    res.status(200).end();
  } catch (error) {
    next(error);
  }
});

app.get("/redirect", (req, res, next) => {
  try {
    const redirectResult = buildRedirectResult(req);
    const { status, redirectUrl } = redirectResult;
    res.set("Cache-Control", "no-store");

    if (shouldAwaitParams(redirectResult)) {
      res.status(200).json({
        code: "AWAITING_PARAMS",
        message: "No passthrough query params yet. Waiting for app to append params before redirect.",
        redirect_preview: redirectUrl,
      });
      return;
    }

    res.redirect(status, redirectUrl);
  } catch (error) {
    next(error);
  }
});

app.use((_req, res) => {
  res.status(404).json({
    code: "NOT_FOUND",
    message: "Route not found",
  });
});

app.use((error, req, res, _next) => {
  const isHttpError = error instanceof HttpError;
  const status = isHttpError ? error.status : 500;
  const payload = {
    code: isHttpError ? error.code : "INTERNAL_ERROR",
    message: isHttpError ? error.message : "Internal server error",
  };

  if (isHttpError && error.details !== undefined) {
    payload.details = error.details;
  }

  if (!isHttpError) {
    console.error("Unhandled error", {
      method: req.method,
      path: req.path,
      message: error.message,
    });
  }

  res.status(status).json(payload);
});

module.exports = app;
