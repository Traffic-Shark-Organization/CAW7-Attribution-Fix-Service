class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function badRequest(message, details) {
  return new HttpError(400, "BAD_REQUEST", message, details);
}

module.exports = {
  HttpError,
  badRequest,
};
