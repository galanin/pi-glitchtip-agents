import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "../gt/api.mjs";

function fakeFetch(routes) {
  return async (url, opts = {}) => {
    const u = new URL(url);
    const key = `${opts.method ?? "GET"} ${u.pathname}`;
    const handler = routes[key] ?? routes[u.pathname];
    if (!handler) return { ok: false, status: 404, json: async () => ({ detail: "not found" }) };
    return handler(u, opts);
  };
}

test("client adds Bearer auth header and baseUrl", async () => {
  let seen;
  const fetch = async (url, opts) => {
    seen = { url, opts };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  const client = createClient({ baseUrl: "https://gt.example.com", token: "T" }, fetch);
  await client.request("/api/0/organizations/o/issues/", { query: { q: "x" } });
  assert.equal(seen.url, "https://gt.example.com/api/0/organizations/o/issues/?q=x");
  assert.equal(seen.opts.headers.Authorization, "Bearer T");
});

test("client throws on non-ok with body detail", async () => {
  const fetch = fakeFetch({
    "GET /api/0/issues/1/": () => ({ ok: false, status: 401, json: async () => ({ detail: "bad token" }) }),
  });
  const client = createClient({ baseUrl: "https://gt.example.com", token: "T" }, fetch);
  await assert.rejects(() => client.request("/api/0/issues/1/"), /401: bad token/);
});

test("client retries on 429 then succeeds", async () => {
  let calls = 0;
  const fetch = async () => {
    calls++;
    if (calls < 3) return { ok: false, status: 429, headers: { get: () => null }, json: async () => ({ detail: "rate" }) };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  const client = createClient({ baseUrl: "https://gt.example.com", token: "T" }, fetch, { maxRetries: 3, baseDelayMs: 0 });
  const data = await client.request("/api/0/issues/1/");
  assert.equal(data.ok, true);
  assert.equal(calls, 3);
});

test("client gives up after maxRetries on persistent 500", async () => {
  let calls = 0;
  const fetch = async () => { calls++; return { ok: false, status: 500, headers: { get: () => null }, json: async () => ({ detail: "boom" }) }; };
  const client = createClient({ baseUrl: "https://gt.example.com", token: "T" }, fetch, { maxRetries: 2, baseDelayMs: 0 });
  await assert.rejects(() => client.request("/api/0/issues/1/"), /500/);
  assert.equal(calls, 3); // initial + 2 retries
});
