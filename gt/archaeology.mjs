// Git archaeology: determine whether the code implicated by a GlitchTip issue
// has changed between the release where the error occurred and the current HEAD.
// Helps distinguish "still-broken" from "already-fixed (stale issue)".

import { execSync } from "node:child_process";

const APP_PATH_RE = /.*((?:app|lib|config|jobs)\/.+)$/
const VENDOR_RE = /\/(bundle|gems|ruby|\.rbenv|\.asdf|vendor)\//;

/**
 * Extract repo-relative app/lib/config/jobs source paths from an event's
 * exception stacktrace frames.
 *
 * @param event A GlitchTip event object with an `entries` array.
 * @returns De-duplicated repo-relative paths (e.g. "app/models/import/session.rb").
 */
export function stackFiles(event) {
  const ex = (event?.entries || []).find((e) => e.type === "exception");
  const frames = ex?.data?.values?.[0]?.stacktrace?.frames || [];
  const files = [];
  for (const f of frames) {
    const name = f?.filename || "";
    if (VENDOR_RE.test(name)) continue; // skip gem/vendor frames (e.g. avo gem's own /app/...)
    const stripped = name.replace(/^\/app\//, ""); // strip common Rails Docker mount root
    const m = stripped.match(APP_PATH_RE);
    if (m && !files.includes(m[1])) files.push(m[1]);
  }
  return files;
}

function git(cwd, args, { allowFail = false } = {}) {
  try {
    return execSync(`git ${args}`, { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (err) {
    if (allowFail) return null;
    throw err;
  }
}

function commitExists(cwd, ref) {
  return git(cwd, `cat-file -e ${ref}^{commit}`, { allowFail: true }) !== null;
}

function isAncestor(cwd, ref) {
  // exit 0 => ancestor; nonzero => not ancestor / error
  return git(cwd, `merge-base --is-ancestor ${ref} HEAD`, { allowFail: true }) !== null;
}

/**
 * Determine staleness of a bug given its release commit and candidate files.
 *
 * @param cwd       Repository working directory.
 * @param releaseCommit  Commit-ish (e.g. short SHA) of the release where the bug occurred.
 * @param files     Candidate repo-relative files implicated by the stacktrace / investigation.
 * @returns {{ releaseCommit, files, commitExists, isAncestor, changedFiles, verdict }}
 *   verdict: "likely-fixed" (some candidate changed since release),
 *            "unchanged" (release is ancestor, no candidate changed),
 *            "unknown" (release not found or not an ancestor of HEAD).
 */
export function archaeology({ cwd, releaseCommit, files }) {
  const result = { releaseCommit, files: files ?? [], commitExists: false, isAncestor: false, changedFiles: [], verdict: "unknown" };
  if (!releaseCommit) return result;
  result.commitExists = commitExists(cwd, releaseCommit);
  if (!result.commitExists) return result;
  result.isAncestor = isAncestor(cwd, releaseCommit);
  if (!result.isAncestor) return result;
  if (!files || files.length === 0) { result.verdict = "ancestor-no-files"; return result; }
  for (const f of files) {
    const log = git(cwd, `log --oneline ${releaseCommit}..HEAD -- ${JSON.stringify(f)}`, { allowFail: true });
    const commits = (log || "").trim().split("\n").filter(Boolean);
    if (commits.length) result.changedFiles.push({ file: f, commits });
  }
  result.verdict = result.changedFiles.length ? "likely-fixed" : "unchanged";
  return result;
}
