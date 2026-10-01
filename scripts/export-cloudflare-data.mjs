import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const tables = ["users", "guests", "conversations", "messages", "progress", "purchases", "entitlements", "quotas"];
const identifier = value => `"${value.replaceAll('"', '""')}"`;

// Read a consistent snapshot. Do not alter the source, print records, or copy
// the local session secret. Pending wallet challenges must be reissued.
export function exportCloudflareData(databasePath, outputPath) {
  if (resolve(databasePath) === resolve(outputPath)) throw new Error("Output must be a separate file");
  const db = new DatabaseSync(databasePath, { readOnly: true });
  const counts = {};
  try {
    db.exec("BEGIN");
    const quote = db.prepare("SELECT quote(?) AS value");
    const lines = ["-- PRIVATE: contains account data and password hashes. Do not commit or publish.", "-- Apply all migrations in cloudflare/migrations to a fresh D1 database first.", "-- Import uses INSERT, so an existing conflicting record fails instead of being overwritten."];
    for (const table of tables) {
      const columns = db.prepare(`PRAGMA table_info(${identifier(table)})`).all().map(column => column.name);
      if (!columns.length) throw new Error(`Source table missing: ${table}`);
      const rows = db.prepare(`SELECT * FROM ${identifier(table)}`).all();
      counts[table] = rows.length;
      for (const row of rows) {
        const values = columns.map(column => quote.get(row[column]).value);
        lines.push(`INSERT INTO ${identifier(table)} (${columns.map(identifier).join(", ")}) VALUES (${values.join(", ")});`);
      }
    }
    db.exec("COMMIT");
    // Refuse overwrites; exported data is readable only by the local owner.
    writeFileSync(outputPath, `${lines.join("\n")}\n`, { mode: 0o600, flag: "wx" });
    return counts;
  } finally { db.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const database = args[args.indexOf("--database") + 1];
  const output = args[args.indexOf("--output") + 1];
  if (!args.includes("--database") || !args.includes("--output") || !database || !output || database.startsWith("--") || output.startsWith("--")) {
    console.error("Usage: npm run db:export:cloudflare -- --database /path/melearn.db --output /private/path/melearn-import.sql");
    process.exitCode = 1;
  } else {
    try { console.log("Export completed (row counts only):", exportCloudflareData(database, output)); }
    catch (error) { console.error(error instanceof Error ? error.message : "Export failed"); process.exitCode = 1; }
  }
}
