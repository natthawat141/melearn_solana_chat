import { existsSync, realpathSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

// Resolve the script itself so launching through the legacy path still uses
// the same source, .next directory, environment files, and local database.
const root = dirname(dirname(realpathSync(fileURLToPath(import.meta.url))));
const mode = process.argv[2];
if (mode !== "dev" && mode !== "start") {
  console.error("Use npm run dev or npm start.");
  process.exit(1);
}

const legacyPath = join(root, "melearn_solana_chat");
if (existsSync(legacyPath) && realpathSync(legacyPath) !== root) {
  console.error("A second checkout exists inside this project. Move it outside the workspace before starting the preview.");
  process.exit(1);
}

const port = 43123;
const host = "127.0.0.1";
const available = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once("error", (error) => {
    if (error.code === "EADDRINUSE") resolve(false);
    else reject(error);
  });
  probe.listen(port, host, () => probe.close(() => resolve(true)));
});
if (!available) {
  console.error(`Preview port ${port} is already in use. Stop the existing preview first; no second server was started.`);
  process.exit(1);
}

console.log(`Melearn workspace: ${root}`);
const args = [join(root, "node_modules/next/dist/bin/next"), mode];
if (mode === "dev") args.push("--turbopack");
args.push("--hostname", host, "--port", String(port), ...process.argv.slice(3));
const child = spawn(process.execPath, args, { cwd: root, stdio: "inherit", env: process.env });
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGINT" || signal === "SIGTERM" ? 0 : 1);
});
