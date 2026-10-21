export type Severity = "info" | "warn" | "error" | "critical";
export const SEVERITIES: Severity[] = ["info", "warn", "error", "critical"];

/**
 * - `line`: every matching line is a finding.
 * - `count`: one finding when `minCount` lines match within the last `lastLines` lines.
 * - `absent-at-exit`: one finding at game exit when no line matches.
 */
export type RuleKind = "line" | "count" | "absent-at-exit";

export interface Rule {
  id: string;
  source: string;
  kind?: RuleKind;
  pattern: string;
  flags?: string;
  ignore?: string;
  minCount?: number;
  lastLines?: number;
  severity: Severity;
  title: string;
  hint?: string;
  report?: string;
}

export interface Finding {
  rule: Rule;
  line: string;
  /** Stable text that identifies this finding within a session. */
  fingerprint: string;
}

const MAX_LINE = 300;

export function severityAtLeast(severity: Severity, min: Severity): boolean {
  return SEVERITIES.indexOf(severity) >= SEVERITIES.indexOf(min);
}

function compile(pattern: string, flags = ""): RegExp {
  return new RegExp(pattern, flags.replace(/[gy]/g, ""));
}

export function validateRules(raw: unknown, sourceIds: string[]): Rule[] {
  if (!Array.isArray(raw)) throw new Error("rules.json must hold an array.");
  const seen = new Set<string>();
  return raw.map((entry: Rule, index) => {
    const where = `rules.json entry ${index} (${entry?.id ?? "no id"})`;
    for (
      const key of ["id", "source", "pattern", "severity", "title"] as const
    ) {
      if (typeof entry?.[key] !== "string") {
        throw new Error(`${where}: "${key}" must be a string.`);
      }
    }
    if (seen.has(entry.id)) throw new Error(`${where}: duplicate id.`);
    seen.add(entry.id);
    if (!sourceIds.includes(entry.source)) {
      throw new Error(
        `${where}: unknown source "${entry.source}". Known: ${
          sourceIds.join(", ")
        }.`,
      );
    }
    if (!SEVERITIES.includes(entry.severity)) {
      throw new Error(
        `${where}: severity must be one of ${SEVERITIES.join(", ")}.`,
      );
    }
    if (
      entry.kind && !["line", "count", "absent-at-exit"].includes(entry.kind)
    ) {
      throw new Error(`${where}: unknown kind "${entry.kind}".`);
    }
    compile(entry.pattern, entry.flags);
    if (entry.ignore) compile(entry.ignore, entry.flags);
    return entry;
  });
}

export async function loadRules(
  path: string,
  sourceIds: string[],
): Promise<Rule[]> {
  return validateRules(JSON.parse(await Deno.readTextFile(path)), sourceIds);
}

const clip = (line: string) => line.trim().slice(0, MAX_LINE);

/** Applies `line` and `count` rules to log text that belongs to `source`. */
export function applyRules(
  rules: Rule[],
  source: string,
  text: string,
): Finding[] {
  const lines = text.split(/\r?\n/);
  const findings: Finding[] = [];
  for (const rule of rules) {
    if (rule.source !== source) continue;
    const kind = rule.kind ?? "line";
    if (kind === "absent-at-exit") continue;
    const re = compile(rule.pattern, rule.flags);
    const ignore = rule.ignore ? compile(rule.ignore, rule.flags) : null;
    const matches = (line: string) =>
      re.test(line) && !(ignore && ignore.test(line));
    if (kind === "line") {
      for (const line of lines) {
        if (matches(line)) {
          findings.push({
            rule,
            line: clip(line),
            fingerprint: `${rule.id}:${clip(line)}`,
          });
        }
      }
    } else {
      const window = lines.slice(-(rule.lastLines ?? 2000));
      const count = window.filter(matches).length;
      if (count >= (rule.minCount ?? 2)) {
        findings.push({
          rule,
          line:
            `${count} lines match /${rule.pattern}/ in the last ${window.length} lines`,
          fingerprint: rule.id,
        });
      }
    }
  }
  return findings;
}

/** Applies `absent-at-exit` rules to the complete text of a log after the game exits. */
export function applyAbsentRules(
  rules: Rule[],
  source: string,
  fullText: string,
): Finding[] {
  const lines = fullText.split(/\r?\n/);
  const findings: Finding[] = [];
  for (const rule of rules) {
    if (rule.source !== source || rule.kind !== "absent-at-exit") continue;
    const re = compile(rule.pattern, rule.flags);
    if (!lines.some((line) => re.test(line))) {
      findings.push({
        rule,
        line: `No line matching /${rule.pattern}/ in ${source}`,
        fingerprint: rule.id,
      });
    }
  }
  return findings;
}
