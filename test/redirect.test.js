const assert = require("node:assert/strict");
const test = require("node:test");

const app = require("../src/app");

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

test("HEAD returns service response and does not redirect", async () => {
  const response = await fetch(
    `${baseUrl}/redirect?target=${encodeURIComponent("https://example.com/path")}&utm_source=ios_app`,
    { method: "HEAD", redirect: "manual" },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("x-redirect-url"), "https://example.com/path?utm_source=ios_app");
});

test("HEAD can return redirect when head_redirect flag is enabled", async () => {
  const response = await fetch(
    `${baseUrl}/redirect?target=${encodeURIComponent("https://example.com/path")}&status=307&head_redirect=true`,
    { method: "HEAD", redirect: "manual" },
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://example.com/path");
  assert.equal(response.headers.get("x-redirect-url"), null);
});

test("GET redirects and forwards source query parameters to target", async () => {
  const response = await fetch(
    `${baseUrl}/redirect?target=${encodeURIComponent("https://example.com/path")}&campaign=summer&click_id=abc123`,
    { redirect: "manual" },
  );

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "https://example.com/path?campaign=summer&click_id=abc123",
  );
});

test("GET preserves existing target query and appends incoming values", async () => {
  const response = await fetch(
    `${baseUrl}/redirect?target=${encodeURIComponent("https://example.com/path?source=web")}&source=app`,
    { redirect: "manual" },
  );

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://example.com/path?source=web&source=app");
});

test("status query param controls redirect status code", async () => {
  const response = await fetch(
    `${baseUrl}/redirect?target=${encodeURIComponent("https://example.com/path")}&status=307`,
    { redirect: "manual" },
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://example.com/path");
});

test("control query params are not forwarded to target URL", async () => {
  const response = await fetch(
    `${baseUrl}/redirect?target=${encodeURIComponent("https://example.com/path")}&status=302&head_redirect=true&campaign=summer`,
    { redirect: "manual" },
  );

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://example.com/path?campaign=summer");
});

test("returns 400 for missing target", async () => {
  const response = await fetch(`${baseUrl}/redirect?campaign=summer`, { redirect: "manual" });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, "BAD_REQUEST");
});

test("returns 400 for invalid target protocol", async () => {
  const response = await fetch(
    `${baseUrl}/redirect?target=${encodeURIComponent("javascript:alert(1)")}`,
    { redirect: "manual" },
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, "BAD_REQUEST");
});

test("returns 400 for invalid head_redirect flag", async () => {
  const response = await fetch(
    `${baseUrl}/redirect?target=${encodeURIComponent("https://example.com/path")}&head_redirect=maybe`,
    { method: "HEAD", redirect: "manual" },
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, "BAD_REQUEST");
});
