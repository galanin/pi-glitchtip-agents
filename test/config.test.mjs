import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig, DEFAULT_CONFIG } from "../gt/config.mjs";

function withTmpConfig(json, fn) {
  const dir = mkdtempSync(join(tmpdir(), "gtcfg-"));
  const path = join(dir, "config.json");
  if (json !== undefined) writeFileSync(path, JSON.stringify(json));
  return fn(path).finally(() => rmSync(dir, { recursive: true, force: true }));
}

test("loadConfig returns defaults merged over file for missing keys", async () => {
  await withTmpConfig({ baseUrl: "https://gt.example.com" }, async (path) => {
    const cfg = await loadConfig(path);
    assert.equal(cfg.baseUrl, "https://gt.example.com");
    assert.equal(cfg.branchTemplate, DEFAULT_CONFIG.branchTemplate);
    assert.equal(cfg.token, "");
  });
});

test("saveConfig writes JSON and round-trips", async () => {
  await withTmpConfig(undefined, async (path) => {
    await saveConfig(path, { ...DEFAULT_CONFIG, token: "abc", org: "o", project: "p" });
    const cfg = await loadConfig(path);
    assert.equal(cfg.token, "abc");
    assert.equal(cfg.org, "o");
  });
});
