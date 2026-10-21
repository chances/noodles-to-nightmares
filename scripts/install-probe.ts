// Compiles a probe script to a main.scm and installs it as the only main script in the GTA3 folder.
// Every existing main.scm (data/ and modloader/*/data/) moves to <GTA3>/.main-backup/<stamp>/ first.
// Then it launches the game, waits for it to exit, restores the backups, and writes the findings to
// tests/results/<name>-<stamp>.md.
// Usage: deno task probe [name]   (installs tests/<name>-probe.txt; no name opens a picker)

import { Select } from "@cliffy/prompt/select";
import { bold, cyan, dim, green, red, yellow } from "@std/fmt/colors";
import { basename, dirname, join, relative, resolve } from "@std/path";

let name = Deno.args[0];
if (!name) {
  const probes: string[] = [];
  for await (const entry of Deno.readDir("tests")) {
    if (entry.isFile && entry.name.endsWith("-probe.txt")) {
      probes.push(entry.name.replace(/-probe\.txt$/, ""));
    }
  }
  if (probes.length === 0) {
    console.error("No tests/*-probe.txt sources found");
    Deno.exit(1);
  }
  if (!Deno.stdin.isTerminal()) {
    console.error(
      `Usage: deno task probe <name>   (one of: ${probes.sort().join(", ")})`,
    );
    Deno.exit(1);
  }
  name = await Select.prompt({
    message: "Install which probe?",
    options: probes.sort(),
  });
}
const input = join(
  "tests",
  `${name.replace(/\.txt$/i, "").replace(/-probe$/i, "")}-probe.txt`,
);
try {
  await Deno.stat(input);
} catch {
  console.error(`No probe source at ${input}`);
  Deno.exit(1);
}

const sanny = Deno.env.get("SANNY") || "sanny.exe";
const gta3 = Deno.env.get("GTA3");
if (!gta3) {
  console.error("GTA3 is not set in .env");
  Deno.exit(1);
}

// Compile next to the source; sanny.exe resolves relative paths against its own folder
const source = resolve(input);
const scm = source.replace(/\.txt$/i, ".scm");
const logPath = join(dirname(sanny), "compile.log");
const stampOf = async () => {
  try {
    return (await Deno.stat(logPath)).mtime?.getTime();
  } catch {
    return undefined;
  }
};
const before = await stampOf();
await new Deno.Command(sanny, {
  args: ["--no-splash", "--mode", "gta3_sbl", "--compile", source, scm],
}).output();
const log = (await stampOf()) !== before
  ? (await Deno.readTextFile(logPath)).trim()
  : "";
if (log.toLowerCase().includes(basename(source).toLowerCase())) {
  console.error(red(`❌ Compile failed\n${log}`));
  Deno.exit(1);
}
console.log(green(`✅ Compiled ${basename(scm)}`));

// Find every installed main script
const installed: string[] = [join(gta3, "data", "main.scm")];
const modloaderDir = join(gta3, "modloader");
for await (const entry of Deno.readDir(modloaderDir)) {
  if (entry.isDirectory) {
    installed.push(join(modloaderDir, entry.name, "data", "main.scm"));
  }
}

// Move them aside
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = join(gta3, ".main-backup", stamp);
const moved: { from: string; to: string }[] = [];
for (const path of installed) {
  try {
    await Deno.stat(path);
  } catch {
    continue;
  }
  const dest = join(backupDir, relative(gta3, path));
  await Deno.mkdir(dirname(dest), { recursive: true });
  await Deno.rename(path, dest);
  moved.push({ from: path, to: dest });
  console.log(
    yellow(`Moved ${relative(gta3, path)} to ${relative(gta3, dest)}`),
  );
}

// Move the previous run's output aside so the findings only hold this run
const probeName = basename(input).replace(/-probe\.txt$/i, "");
const probeIni = join(gta3, "CLEO", `${probeName}-probe.ini`);
try {
  await Deno.stat(probeIni);
  await Deno.rename(probeIni, join(backupDir, `${probeName}-probe.ini`));
  console.log(yellow(`Moved stale ${probeName}-probe.ini to the backup`));
} catch {
  // No earlier output
}

// Install the probe as the only main script
const mainPath = join(gta3, "data", "main.scm");
await Deno.copyFile(scm, mainPath);
console.log(green("Installed data/main.scm"));

// Launch the game and wait for it to exit; prefer the unflagged runner, as scripts/run.ts does
let exe = join(gta3, "gta3.exe");
try {
  const runner = join(gta3, "gta3-game.exe");
  if ((await Deno.stat(runner)).isFile) exe = runner;
} catch {
  // Fall back to gta3.exe
}
console.log(dim(`Launching ${exe}`));
console.log(bold(cyan("⏳ Waiting for the game to exit")));
const startedAt = Date.now();
let exitCode = -1;
try {
  exitCode = (await new Deno.Command(exe, { cwd: gta3 }).spawn().status).code;
} finally {
  // Keep the probe's main next to the backups, then put every original back
  await Deno.rename(mainPath, join(backupDir, "probe-main.scm"));
  for (const { from, to } of moved) {
    await Deno.mkdir(dirname(from), { recursive: true });
    await Deno.rename(to, from);
    console.log(green(`Restored ${relative(gta3, from)}`));
  }
}
const seconds = Math.round((Date.now() - startedAt) / 1000);

// Log the findings
const readOrEmpty = async (path: string) => {
  try {
    return await Deno.readTextFile(path);
  } catch {
    return "";
  }
};
const cleoLog = await readOrEmpty(join(gta3, "cleo.log"));
const reduxLog = await readOrEmpty(join(gta3, "cleo_redux.log"));
const scrLog = await readOrEmpty(join(gta3, "scrlog.log"));
const ini = (await readOrEmpty(probeIni)).trim();
const problems = (text: string) =>
  text.split(/\r?\n/).filter((line) =>
    /incorrect|error|fail|invalid|unknown/i.test(line)
  ).slice(-20);
const block = (lines: string[]) => lines.length ? lines.join("\n") : "(none)";

const cleoClean = /--Game Shutdown--/.test(cleoLog);
const scrClean = /Logging finished/.test(scrLog);

// A probe key named `..._expect_N` (or `_expect_minusN`) states the value the game should write
const failures: string[] = [];
if (!cleoClean) failures.push("CLEO shutdown marker missing (likely a crash)");
if (!scrClean) failures.push("SCRLog footer missing (likely a crash)");
for (const line of ini.split(/\r?\n/)) {
  const match = line.match(/^(.*_expect_(minus)?(\d+))=(-?\d+)\s*$/);
  if (!match) continue;
  const expected = (match[2] ? -1 : 1) * Number(match[3]);
  if (Number(match[4]) !== expected) {
    failures.push(`${match[1]}: wrote ${match[4]}`);
  }
}
const passed = failures.length === 0;

const report = `# Probe: ${probeName}

| Field | Value |
| --- | --- |
| Result | ${passed ? "pass" : "fail"} |
| Started | ${stamp} |
| Duration | ${seconds} s |
| Exit code | ${exitCode} |
| CLEO shutdown marker | ${cleoClean ? "present" : "missing (likely a crash)"} |
| SCRLog footer | ${scrClean ? "present" : "missing (likely a crash)"} |
| Backups | ${relative(gta3, backupDir)} |

## Failures

\`\`\`
${block(failures)}
\`\`\`

## Probe Output

\`\`\`ini
${ini || "(no output file)"}
\`\`\`

## CLEO Problems

\`\`\`
${block(problems(cleoLog))}
\`\`\`

## CLEO Redux Problems

\`\`\`
${block(problems(reduxLog))}
\`\`\`

## SCRLog Tail

\`\`\`
${scrLog.split(/\r?\n/).slice(-30).join("\n")}
\`\`\`
`;
await Deno.mkdir(join("tests", "results"), { recursive: true });
const reportPath = join("tests", "results", `${probeName}-${stamp}.md`);
await Deno.writeTextFile(reportPath, report);
console.log(dim(`Findings written to ${reportPath}`));
if (passed) {
  console.log(bold(green("✅ Probe passed")));
} else {
  console.log(bold(red("❌ Probe failed")));
  for (const failure of failures) console.log(red(`  ${failure}`));
  Deno.exitCode = 1;
}
