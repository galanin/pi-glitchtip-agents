import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../gt/gt.mjs";

test("parseArgs splits command, flags, and positional id", () => {
  const { command, args } = parseArgs(["config", "set", "baseUrl", "https://x"]);
  assert.equal(command, "config");
  assert.deepEqual(args._, ["set", "baseUrl", "https://x"]);
  assert.equal(args.id, "set");
});

test("parseArgs parses --flags with values and bare flags", () => {
  const { command, args } = parseArgs(["issues", "--since", "2w", "--limit", "5", "--verbose"]);
  assert.equal(command, "issues");
  assert.equal(args.since, "2w");
  assert.equal(args.limit, "5");
  assert.equal(args.verbose, true);
  assert.equal(args.id, undefined);
});
