import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const suite = process.argv[2];
const commands = {
  unit: ["node_modules/vitest/vitest.mjs", ["run", "tests/unit", "--reporter=verbose"]],
  api: ["node_modules/vitest/vitest.mjs", ["run", "tests/api", "--reporter=verbose"]],
  e2e: ["node_modules/@playwright/test/cli.js", ["test"]]
};

if (!commands[suite]) throw new Error(`Suite desconocida: ${suite}`);

const startedAt = new Date();
const [entryPoint, args] = commands[suite];
const result = spawnSync(process.execPath, [path.resolve(entryPoint), ...args], { encoding: "utf8", env: process.env, shell: false });
const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? `\nError de infraestructura: ${result.error.message}\n` : ""}`;
process.stdout.write(output);

const finishedAt = new Date();
const cleanOutput = output.replace(/\u001b\[[0-9;]*m/g, "");
const executedTests = cleanOutput
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("✓ tests/") || /^ok \d+ /.test(line) || /^x \d+ /.test(line));
const record = {
  suite,
  command: `node ${entryPoint} ${args.join(" ")}`,
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt - startedAt,
  status: result.status === 0 ? "APROBADO" : "FALLIDO",
  exitCode: result.status ?? 1,
  tests: executedTests
};

const resultsDirectory = path.resolve("test-results");
mkdirSync(resultsDirectory, { recursive: true });
appendFileSync(path.join(resultsDirectory, "test-history.jsonl"), `${JSON.stringify(record)}\n`);
writeFileSync(
  path.join(resultsDirectory, `latest-${suite}.log`),
  [`Suite: ${suite}`, `Estado: ${record.status}`, `Inicio: ${record.startedAt}`, `Duración: ${record.durationMs} ms`, "", output].join("\n")
);

process.exit(record.exitCode);
