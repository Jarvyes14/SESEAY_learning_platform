import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const resultsDirectory = path.resolve("test-results");
mkdirSync(resultsDirectory, { recursive: true });
const historyPath = path.join(resultsDirectory, "test-history.jsonl");
const records = existsSync(historyPath)
  ? readFileSync(historyPath, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
  : [];
const lines = ["# Historial de pruebas", "", "Este archivo se genera a partir de todas las suites ejecutadas con los scripts de npm.", "", "| Fecha | Suite | Estado | Duración |", "|---|---|---:|---:|"];
for (const record of records) {
  lines.push(`| ${record.startedAt} | ${record.suite} | ${record.status} | ${record.durationMs} ms |`);
}
lines.push("", "## Casos ejecutados", "");
for (const record of records) {
  lines.push(`### ${record.startedAt} · ${record.suite} · ${record.status}`, "");
  if (record.tests?.length) {
    for (const test of record.tests) lines.push(`- ${test}`);
  } else {
    lines.push("- La suite no llegó a ejecutar casos individuales.");
  }
  lines.push("");
}
writeFileSync(path.join(resultsDirectory, "TEST-HISTORY.md"), `${lines.join("\n")}\n`);
console.log(path.join(resultsDirectory, "TEST-HISTORY.md"));
