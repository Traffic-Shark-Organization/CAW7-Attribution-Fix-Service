const express = require("express");

const { HttpError } = require("./errors");
const { buildRedirectResult } = require("./redirect-service");

const app = express();
app.disable("x-powered-by");

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.head("/redirect", (req, res, next) => {
  try {
    const { status, headRedirect, redirectUrl } = buildRedirectResult(req);
    res.set("Cache-Control", "no-store");

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
    const { status, redirectUrl } = buildRedirectResult(req);
    res.set("Cache-Control", "no-store");
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
