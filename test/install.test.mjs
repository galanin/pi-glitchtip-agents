import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeTierIntoSuperagentsConfig, mergePackageDefaults } from "../install.mjs";

test("mergeTierIntoSuperagentsConfig adds glitchtip tier without overwriting existing", () => {
  const cfg = { superagents: { modelTiers: { cheap: { model: "x" } } } };
  const out = mergeTierIntoSuperagentsConfig(cfg, { model: "ollama/qwen3:35b", thinking: "low" });
  assert.equal(out.superagents.modelTiers.glitchtip.model, "ollama/qwen3:35b");
  assert.equal(out.superagents.modelTiers.cheap.model, "x");
});

test("mergeTierIntoSuperagentsConfig does not overwrite a user-set glitchtip tier", () => {
  const cfg = { superagents: { modelTiers: { glitchtip: { model: "user-set" } } } };
  const out = mergeTierIntoSuperagentsConfig(cfg, { model: "ollama/qwen3:35b", thinking: "low" });
  assert.equal(out.superagents.modelTiers.glitchtip.model, "user-set");
});

test("mergePackageDefaults preserves token/connection, fills defaults", () => {
  const existing = { baseUrl: "https://x", token: "T", org: "o", project: "p" };
  const out = mergePackageDefaults(existing);
  assert.equal(out.token, "T");
  assert.equal(out.branchTemplate, "fix/glitchtip/<short-id>");
});
