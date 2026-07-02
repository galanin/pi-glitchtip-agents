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
