import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkPublicRepo, hasSecret, isPrivatePath } from "../scripts/check-public-repo.mjs";

test("public repo guard blocks credentials and exports while allowing example configuration", () => {
  for (const path of [".env.production", "data/session.secret", "cloudflare/imports/accounts.sql", "backup.db", "secrets.production.json"]) {
    assert.equal(isPrivatePath(path), true, path);
  }
  assert.equal(isPrivatePath(".env.example"), false);
  assert.equal(isPrivatePath("cloudflare/migrations/0001_initial.sql"), false);
  assert.equal(hasSecret("const key = '" + "tvly-" + "x".repeat(32) + "';"), true);
  assert.equal(hasSecret("AI_API_KEY="), false);
});

test("public repo guard catches a staged secret even after the working file is cleaned", () => {
  const root = mkdtempSync(join(tmpdir(), "melearn-public-guard-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
  try {
    git("init");
    const value = "a-local-credential-for-the-guard-test";
    writeFileSync(join(root, ".gitignore"), ".env.local\n");
    writeFileSync(join(root, ".env.local"), `AI_API_KEY=${value}\n`);
    writeFileSync(join(root, "source.js"), `const key = '${value}';`);
    git("add", "source.js");
    writeFileSync(join(root, "source.js"), "const key = process.env.AI_API_KEY;");
    assert.ok(checkPublicRepo(root).some((finding: string) => finding === "Possible secret in Git: source.js"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("public repo guard scans a credential deleted from the latest commit", () => {
  const root = mkdtempSync(join(tmpdir(), "melearn-public-history-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
  try {
    git("init");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Guard Test");
    writeFileSync(join(root, "source.js"), "const key = '" + "tvly-" + "x".repeat(32) + "';");
    git("add", "source.js");
    git("commit", "-m", "fixture");
    writeFileSync(join(root, "source.js"), "const key = process.env.TAVILY_API_KEY;");
    git("add", "source.js");
    git("commit", "-m", "clean fixture");
    assert.deepEqual(checkPublicRepo(root), []);
    assert.ok(checkPublicRepo(root, true).some((finding: string) => finding === "Possible secret in Git: source.js"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
