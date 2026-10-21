// Converts Markdown headings to Title Case. Dry run by default; pass --write to apply.
// Usage: deno run --allow-read --allow-write scripts/title-case-headings.ts [--write]

import { green, red, say } from "./log.ts";

const SKIP_DIRS = new Set([".git", "node_modules", ".remember", "dist"]);

// Short articles, conjunctions, and prepositions stay lowercase unless first.
const SMALL = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "vs",
  "via",
  "nor",
  "so",
  "yet",
]);

// Words that stay as written (proper nouns, product names, code keywords).
const KEEP = new Set([
  "Rosa",
  "Chang",
  "Portland",
  "Staunton",
  "Island",
  "Shoreside",
  "Vale",
  "Blender",
  "Sanny",
  "Builder",
  "ModLoader",
  "RenderWare",
  "Liberty",
  "Noodles",
  "Nightmares",
  "Punk",
  "Cycles",
  "Drag-N-Drop",
  "GTAMods",
  "Wiki",
  "Gosub",
  "Goto",
  "Prelit",
]);

// Prefixes whose trailing text is a proper title and stays as written.
const TITLE_AFTER = [
  /^(Mission \d+:\s*)(.*)$/,
  /^(Act \w+:\s*)(.*)$/,
  /^(Side Mission:\s*)(.*)$/,
  /^(Dramatic Turn:\s*)(.*)$/,
  /^(.*?Mission \d+ — )(.*)$/,
  /^(.*?\(Act \w+:\s*)(.*)$/,
];

function convertWord(word: string, first: boolean): string {
  if (word === "") return word;
  // Protected: code spans, quoted text, anything with non-letter characters inside.
  const core = word.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
  if (core === "") return word;
  if (/[`"'\/._\d→–]/.test(core)) return word;
  if (KEEP.has(core)) return word;
  // Acronyms and mixed-case identifiers (IDE, TXD, NPCs, GTA, III).
  if (/^[A-Z]{2,}s?$/.test(core) || /[a-z][A-Z]/.test(core)) return word;
  if (/^[A-Z]$/.test(core)) return word;
  const lower = core.toLowerCase();
  if (!first && SMALL.has(lower)) return word.replace(core, lower);
  const titled = lower.split("-").map((p) =>
    p ? p[0].toUpperCase() + p.slice(1) : p
  ).join("-");
  return word.replace(core, titled);
}

function convertText(text: string): string {
  for (const re of TITLE_AFTER) {
    const m = text.match(re);
    if (m) return m[1] + m[2];
  }
  const parts = text.split(/(`[^`]*`|"[^"]*"|“[^”]*”)/);
  let first = true;
  let afterColon = false;
  const joined = parts.map((part) => {
    if (/^(`|"|“)/.test(part)) {
      first = false;
      afterColon = false;
      return part;
    }
    return part.split(/(\s+)/).map((tok) => {
      if (/^\s*$/.test(tok)) return tok;
      const out = convertWord(tok, first || afterColon);
      first = false;
      afterColon = tok.endsWith(":") || tok === "—";
      return out;
    }).join("");
  }).join("");
  return joined;
}

function convertHeading(line: string): string {
  const m = line.match(/^(#{1,6} )(.*)$/);
  if (!m) return line;
  const rest = m[2];
  // Preserve leading numbering ("3. ") and emoji prefixes.
  const lead = rest.match(/^((?:\d+\.\s+)|(?:[✅❌]\s*))?(.*)$/u)!;
  return m[1] + (lead[1] ?? "") + convertText(lead[2]);
}

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const e of Deno.readDir(dir)) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory) {
      if (!SKIP_DIRS.has(e.name)) yield* walk(p);
    } else if (e.name.endsWith(".md")) yield p;
  }
}

const write = Deno.args.includes("--write");
let changed = 0;
for await (const path of walk(".")) {
  const text = await Deno.readTextFile(path);
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  let fence = false;
  let touched = false;
  const out = text.split(/\r?\n/).map((line) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence || !/^#{1,6} /.test(line)) return line;
    const next = convertHeading(line);
    if (next !== line) {
      touched = true;
      changed++;
      say.text(`${path}\n${red(`  - ${line}`)}\n${green(`  + ${next}`)}`);
    }
    return next;
  }).join(eol);
  if (write && touched) await Deno.writeTextFile(path, out);
}
say.pass(`${changed} heading(s) ${write ? "rewritten" : "would change"}`);
