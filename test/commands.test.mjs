import { test } from "node:test";
import assert from "node:assert/strict";
import { sortCriticality, parseSince, issuesQuery, STATUS_RANK, LEVEL_RANK } from "../gt/commands.mjs";

test("LEVEL_RANK orders fatal>error>warning>info", () => {
  // NOTE: JS does not support chained comparisons (a > b > c); the original
  // packet test wrote `LEVEL_RANK.fatal > LEVEL_RANK.error > LEVEL_RANK.warning
  // > LEVEL_RANK.info`, which evaluates `(true > 20)` -> false. Split into
  // explicit inequalities to express the same intent.
  assert.ok(LEVEL_RANK.fatal > LEVEL_RANK.error);
  assert.ok(LEVEL_RANK.error > LEVEL_RANK.warning);
  assert.ok(LEVEL_RANK.warning > LEVEL_RANK.info);
});

test("sortCriticality ranks by level, times_seen, last_seen, status", () => {
  const issues = [
    { id: 1, level: "warning", times_seen: 50, last_seen: "2026-07-01T00:00:00Z", status: "unresolved" },
    { id: 2, level: "error", times_seen: 5, last_seen: "2026-07-02T00:00:00Z", status: "unresolved" },
    { id: 3, level: "error", times_seen: 5, last_seen: "2026-07-02T00:00:00Z", status: "resolved" },
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

test("issuesQuery builds query string from filters", () => {
  const q = issuesQuery({ since: "2w", status: "unresolved", query: "is:unresolved", limit: 10 });
  assert.equal(q.statsPeriod, "2w");
  assert.equal(q.query, "is:unresolved");
  assert.equal(q.limit, 10);
  assert.equal(q.status, "unresolved");
});
