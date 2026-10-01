import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const tokenPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /sk-(?:or-v1-|proj-)?[A-Za-z0-9_-]{24,}/,
  /tvly-[A-Za-z0-9_-]{24,}/,
  /sb_secret_[A-Za-z0-9_-]{24,}/,
  /AKIA[0-9A-Z]{16}/,
];

export function isPrivatePath(path) {
  const name = basename(path);
  return (name === ".env" || (name.startsWith(".env.") && name !== ".env.example"))
    || name.startsWith(".dev.vars")
    || /(^|\/)(data|\.wrangler|node_modules|\.next)(\/|$)/.test(path)
    || /(^|\/)cloudflare\/imports\//.test(path)
    || /\.(?:db|sqlite|sqlite3)(?:-(?:wal|shm))?$/.test(name)
    || /\.(?:pem|key|p12|pfx)$/.test(name)
    || /^secrets(?:\..*)?\.json$/.test(name);
}

export function hasSecret(content, knownValues = []) {
  const text = Buffer.isBuffer(content) ? content.toString("utf8") : content;
  return tokenPatterns.some((pattern) => pattern.test(text))
    || knownValues.some((value) => value.length >= 8 && text.includes(value));
}

function localSecretValues(root) {
  const values = [];
  for (const name of readdirSync(root)) {
    if (!/^\.env(?:\.|$)/.test(name) || name === ".env.example") continue;
    const path = resolve(root, name);
    if (!lstatSync(path).isFile()) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match || match[1].startsWith("NEXT_PUBLIC_") || !/KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL/.test(match[1])) continue;
      values.push(match[2].trim().replace(/^(["'])(.*)\1$/, "$2"));
    }
  }
  const session = resolve(root, "data/session.secret");
  if (existsSync(session)) values.push(readFileSync(session, "utf8").trim());
  return values;
}

export function checkPublicRepo(root, history = false) {
  const git = (args, options = {}) => execFileSync("git", args, { cwd: root, maxBuffer: 128 * 1024 * 1024, ...options });
  const knownValues = localSecretValues(root);
  const findings = new Set();
  const files = git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).toString().split("\0").filter(Boolean);
  for (const path of files) {
    if (isPrivatePath(path)) findings.add(`Private file: ${path}`);
    const absolute = resolve(root, path);
    if (!existsSync(absolute) || !lstatSync(absolute).isFile()) continue;
    if (hasSecret(readFileSync(absolute), knownValues)) findings.add(`Possible secret: ${path}`);
  }
  // Check staged content too: editing a file after staging must not hide a leaked blob.
  const staged = git(["ls-files", "--stage", "-z"]).toString().split("\0").filter(Boolean).map((line) => {
    const match = line.match(/^\d+ ([a-f0-9]+) \d+\t(.*)$/s);
    return match && { oid: match[1], path: match[2] };
  }).filter(Boolean);
  const objects = history
    ? git(["rev-list", "--objects", "--all"]).toString().split("\n").filter(Boolean).map((line) => {
      const [oid, ...parts] = line.split(" ");
      return { oid, path: parts.join(" ") };
    }).concat(staged)
    : staged;
  const unique = [...new Map(objects.map((object) => [object.oid, object])).values()];
  const types = git(["cat-file", "--batch-check=%(objecttype)"], { input: unique.map(({ oid }) => oid).join("\n") + "\n" }).toString().trim().split("\n");
  unique.forEach(({ oid, path }, index) => {
    if (types[index] !== "blob") return;
    if (isPrivatePath(path)) findings.add(`Private file in Git: ${path}`);
    if (hasSecret(git(["cat-file", "blob", oid]), knownValues)) findings.add(`Possible secret in Git: ${path || oid}`);
  });
  return [...findings];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const findings = checkPublicRepo(process.cwd(), process.argv.includes("--history"));
  if (findings.length) {
    console.error("Public repository check failed. Only filenames are shown:");
    for (const finding of findings) console.error(finding);
    process.exitCode = 1;
  } else console.log("Public repository check passed (private paths, known local secrets, and token patterns).");
}
