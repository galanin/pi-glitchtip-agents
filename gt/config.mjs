import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export const DEFAULT_CONFIG = Object.freeze({
  baseUrl: "",
  token: "",
  org: "",
  project: "",
  branchTemplate: "fix/glitchtip/<short-id>",
});

export async function loadConfig(path) {
  let raw;
  try {
    raw = await readFile(path, "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") return { ...DEFAULT_CONFIG };
    throw err;
  }
  let parsed = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }
  return { ...DEFAULT_CONFIG, ...parsed };
}

export async function saveConfig(path, config) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
