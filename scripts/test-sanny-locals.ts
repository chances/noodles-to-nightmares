// Compiles small scripts with the Sanny CLI to test CLEO local variable limits and typed locals.
// Usage: deno run --allow-all --env-file=.env scripts/test-sanny-locals.ts

import { say } from "./log.ts";

const sanny = Deno.env.get("SANNY") || "sanny.exe";
const dir = await Deno.makeTempDir({ prefix: "sanny-locals-" });

const ints = (n: number) =>
  Array.from({ length: n }, (_, i) => `int loc${i} = ${i}`).join("\n");

// {$CLEO .tst} gives CLEO syntax (local declarations); the .tst extension is never loaded by CLEO.
const head = `{$CLEO .tst}\n`;
const func =
  `function f(heading: float): float\n  float opposite = heading\n  opposite += 180.0\n  cleo_return 1 opposite\nend\n`;
const withFunc = (n: number) =>
  `${head}jump @start\n${func}:start\n${
    ints(n)
  }\nfloat r = f(1.0)\nterminate_this_custom_script\n`;

const cases: Record<string, string> = {
  // Syntax probes
  "probe-init-then-wait":
    `${head}int a = 1\nwait 0\nterminate_this_custom_script\n`,
  "probe-decl-then-assign":
    `${head}int a\na = 1\nwait 0\nterminate_this_custom_script\n`,
  "probe-two-inits-then-wait":
    `${head}int a = 1\nint b = 2\nwait 0\nterminate_this_custom_script\n`,
  "probe-legacy-local": `${head}0@ = 1\nwait 0\nterminate_this_custom_script\n`,
  "probe-char-handle-after-wait":
    `${head}int sal\nwait 0\nChar.Create(PedType.Special, #SPECIAL01, 1.0, 2.0, 3.0, sal)\nterminate_this_custom_script\n`,
  // Local count: find where the compiler rejects. Timers use 16@ and 17@.
  "locals-15": `${head}${ints(15)}\nterminate_this_custom_script\n`,
  "locals-16": `${head}${ints(16)}\nterminate_this_custom_script\n`,
  "locals-17": `${head}${ints(17)}\nterminate_this_custom_script\n`,
  // Typed locals
  "typed-char-keyword":
    `${head}Char sal\nChar.Create(PedType.Special, #SPECIAL01, 1.0, 2.0, 3.0, sal)\nterminate_this_custom_script\n`,
  "typed-char-var":
    `${head}var sal: Char\nChar.Create(PedType.Special, #SPECIAL01, 1.0, 2.0, 3.0, sal)\nterminate_this_custom_script\n`,
  "int-as-char-handle":
    `${head}int sal\nChar.Create(PedType.Special, #SPECIAL01, 1.0, 2.0, 3.0, sal)\nChar.Delete(sal)\nterminate_this_custom_script\n`,
  "int-as-blip-handle":
    `${head}int b\nb = Blip.AddForCoord(1.0, 2.0, 3.0)\nBlip.Remove(b)\nterminate_this_custom_script\n`,
  // Function locals alongside script locals
  "func-only": withFunc(0),
  // The call result `r` is a script local too, so withFunc(15) uses 16 script locals in total.
  "func-with-16-script-locals": withFunc(15),
  "func-with-17-script-locals": withFunc(16),
};

for (const [name, source] of Object.entries(cases)) {
  const input = `${dir}\\${name}.txt`;
  const output = `${dir}\\${name}.cs`;
  await Deno.writeTextFile(input, source);
  await new Deno.Command(sanny, {
    args: ["--no-splash", "--mode", "gta3_sbl", "--compile", input, output],
  }).output();
  const logPath = `${sanny.replace(/[^\\/]+$/, "")}compile.log`;
  let log = "(no compile.log)";
  try {
    log = (await Deno.readTextFile(logPath)).trim();
  } catch { /* keep default */ }
  const stale = !log.includes(`${name}.txt`);
  say.text(
    `${name}: ${
      stale ? "no error logged for this case" : log.replace(dir + "\\", "")
    }`,
  );
}
