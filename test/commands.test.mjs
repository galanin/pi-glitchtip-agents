import { test } from "node:test";
import assert from "node:assert/strict";
import { sortCriticality, parseSince, issuesQuery, STATUS_RANK, LEVEL_RANK, resolveIssueRef } from "../gt/commands.mjs";

test("LEVEL_RANK orders fatal>error>warning>info", () => {
  // NOTE: JS does not support chained comparisons (a > b > c); the original
  // packet test wrote `LEVEL_RANK.fatal > LEVEL_RANK.error > LEVEL_RANK.warning
  // > LEVEL_RANK.info`, which evaluates `(true > 20)` -> false. Split into
  // explicit inequalities to express the same intent.
  assert.ok(LEVEL_RANK.fatal > LEVEL_RANK.error);
  assert.ok(LEVEL_RANK.error > LEVEL_RANK.warning);
  assert.ok(LEVEL_RANK.warning > LEVEL_RANK.info);
});

// GlitchTip real field names: `count` (string times-seen), `lastSeen` (camelCase).
test("sortCriticality ranks by level, count, lastSeen, status", () => {
  const issues = [
    { id: 1, level: "warning", count: "50", lastSeen: "2026-07-01T00:00:00Z", status: "unresolved" },
    { id: 2, level: "error", count: "5", lastSeen: "2026-07-02T00:00:00Z", status: "unresolved" },
    { id: 3, level: "error", count: "5", lastSeen: "2026-07-02T00:00:00Z", status: "resolved" },
  ];
  const sorted = sortCriticality(issues).map((i) => i.id);
  // error unresolved (2) > error resolved (3) > warning unresolved (1)
  assert.deepEqual(sorted, [2, 3, 1]);
});

test("parseSince converts 2w to statsPeriod and 0 disables", () => {
  assert.equal(parseSince("2w"), "2w");
  assert.equal(parseSince(undefined), "2w");
  assert.equal(parseSince("0"), undefined);
});

test("parseSince 'none' disables statsPeriod", () => {
  assert.equal(parseSince("none"), undefined);
});

test("issuesQuery builds query string from filters", () => {
  const q = issuesQuery({ since: "2w", status: "unresolved", query: "is:unresolved", limit: 10 });
  assert.equal(q.statsPeriod, "2w");
  assert.equal(q.query, "is:unresolved");
  assert.equal(q.limit, 10);
  assert.equal(q.status, "unresolved");
});

test("resolveIssueRef passes numeric ids through without API calls", async () => {
  let called = false;
  const client = { request: async () => { called = true; } };
  assert.equal(await resolveIssueRef({ client, config: { org: "o" } }, "363"), "363");
  assert.equal(called, false);
});

test("resolveIssueRef resolves a shortId via the issues list", async () => {
  const client = { request: async () => [{ id: "363", shortId: "GRAD-STAGING-R" }] };
  assert.equal(await resolveIssueRef({ client, config: { org: "o" } }, "GRAD-STAGING-R"), "363");
});

test("resolveIssueRef throws when shortId is not found", async () => {
  const client = { request: async () => [] };
  await assert.rejects(() => resolveIssueRef({ client, config: { org: "o" } }, "NOPE"), /shortId not found/);
});
