import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { stackFiles, archaeology } from "../gt/archaeology.mjs";

function git(cwd, args) {
  return execSync(`git ${args}`, { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
}

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), "arch-"));
  git(dir, "init -q");
  git(dir, 'config user.email t@t.t'); git(dir, 'config user.name t');
  return dir;
}
function commit(cwd, msg) { git(cwd, `add -A`); git(cwd, `commit -q -m "${msg}"`); return git(cwd, "rev-parse HEAD").trim(); }
function short(sha) { return sha.slice(0, 8); }

test("stackFiles extracts repo-relative app/lib/config/jobs paths from event exception frames", () => {
  const event = {
    entries: [
      {
        type: "exception",
        data: {
          values: [
            {
              stacktrace: {
                frames: [
                  { filename: "/usr/local/bundle/ruby/gems/avo-3.31.1/app/controllers/avo/base_application_controller.rb" },
                  { filename: "/app/app/models/import/session.rb" },
                  { filename: "/app/app/avo/resources/import_session.rb" },
                  { filename: "/app/config/initializers/good_job.rb" },
                  { filename: "/usr/local/bundle/ruby/gems/activerecord/lib/active_record.rb" },
                ],
              },
            },
          ],
        },
      },
    ],
  };
  assert.deepEqual(stackFiles(event), [
    "app/models/import/session.rb",
    "app/avo/resources/import_session.rb",
    "config/initializers/good_job.rb",
  ]);
});

test("archaeology: likely-fixed when a candidate file changed since release", () => {
  const cwd = makeRepo();
  mkdirSync(join(cwd, "app", "models"), { recursive: true });
  writeFileSync(join(cwd, "app", "models", "session.rb"), "v1\n");
  const release = commit(cwd, "release point");
  writeFileSync(join(cwd, "app", "models", "session.rb"), "v2\n");
  commit(cwd, "fix the association");
  const r = archaeology({ cwd, releaseCommit: short(release), files: ["app/models/session.rb"] });
  assert.equal(r.isAncestor, true);
  assert.equal(r.verdict, "likely-fixed");
  assert.equal(r.changedFiles.length, 1);
  assert.match(r.changedFiles[0].commits[0], /fix the association/);
  rmSync(cwd, { recursive: true, force: true });
});

test("archaeology: unchanged when no candidate file changed since release", () => {
  const cwd = makeRepo();
  mkdirSync(join(cwd, "app", "models"), { recursive: true });
  writeFileSync(join(cwd, "app", "models", "session.rb"), "v1\n");
  const release = commit(cwd, "release point");
  // unrelated change elsewhere
  mkdirSync(join(cwd, "other"), { recursive: true });
  writeFileSync(join(cwd, "other", "x.rb"), "x\n");
  commit(cwd, "unrelated");
  const r = archaeology({ cwd, releaseCommit: short(release), files: ["app/models/session.rb"] });
  assert.equal(r.verdict, "unchanged");
  assert.equal(r.changedFiles.length, 0);
  rmSync(cwd, { recursive: true, force: true });
});

test("archaeology: unknown when release commit is not an ancestor of HEAD", () => {
  const cwd = makeRepo();
  writeFileSync(join(cwd, "a.rb"), "a\n");
  commit(cwd, "base");
  // create a divergent commit that is NOT an ancestor of a fresh HEAD
  execSync('git -C "' + cwd + '" checkout -q -b side');
  writeFileSync(join(cwd, "side.rb"), "s\n");
  const sideSha = commit(cwd, "side");
  execSync('git -C "' + cwd + '" checkout -q main 2>/dev/null || git -C "' + cwd + '" checkout -q master');
  const r = archaeology({ cwd, releaseCommit: short(sideSha), files: ["a.rb"] });
  assert.equal(r.verdict, "unknown");
  rmSync(cwd, { recursive: true, force: true });
});
