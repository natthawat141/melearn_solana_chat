import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextDir = path.join(root, ".next");
const openNextDir = path.join(root, ".open-next");

fs.rmSync(nextDir, { recursive: true, force: true });
fs.rmSync(openNextDir, { recursive: true, force: true });
execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit", env: { ...process.env, COPYFILE_DISABLE: "1" } });

function removeAppleDouble(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.name.startsWith("._")) {
      fs.rmSync(target, { recursive: true, force: true });
    } else if (entry.isDirectory()) {
      removeAppleDouble(target);
    }
  }
}

removeAppleDouble(nextDir);
removeAppleDouble(openNextDir);
execFileSync("npx", ["opennextjs-cloudflare", "build", "--skipNextBuild", "--config", "wrangler.jsonc"], { cwd: root, stdio: "inherit", env: { ...process.env, COPYFILE_DISABLE: "1" } });
removeAppleDouble(openNextDir);
