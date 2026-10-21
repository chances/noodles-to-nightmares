---
state: fixed
---
# Sanny Compile Errors Were Invisible to the Build

**Status**: Fixed in `scripts/build.ts` (compile.log check, `--force`) and `missions/0_tutorial.txt`. Compile-only: nothing was run in the game.

## Symptom
`deno task build` reported every mission as compiled while `0_tutorial.txt` had a syntax error. The packaged `.cm` came from an earlier compile.

## Root Cause
`sanny.exe --compile` exits `0` on a compile error, writes the error to `compile.log` beside `sanny.exe`, and still produces an output file. `build.ts` only checked the exit code. The hash cache then skipped the file on later builds because its sources had not changed since the cached hash.

## Evidence
`scripts/check-compile.ts` on the tutorial reported `0_tutorial.txt:54 Unknown directive`. The pre-refactor version from `git show HEAD:missions/0_tutorial.txt` failed the same way at line 51. Removing the nested `if not` block made it compile, and the one-line form compiled too:

```
// Failed: the condition on its own line
if not
  Player.IsDead($player)
then

// Compiles
if not Player.IsDead($player)
then
```

## Fix
- `compile()` in `scripts/build.ts` compares the `compile.log` modification time before and after each compile and exits `1` when the new log names the input file.
- `deno task build --force` ignores the hash cache.
- `missions/0_tutorial.txt` uses the one-line `if not`.
- `scripts/check-compile.ts <script.txt>...` compiles any script to `dist/.lint/out` and prints its log entry. Pass absolute or project-relative paths; the script resolves them because `sanny.exe` reads relative paths against its own folder.

## Ruled Out
| Candidate | Evidence |
| :--- | :--- |
| `if or` with two conditions | `dist/.lint` experiment compiled it |
| Nested `if not` block as such | The one-line `if not` form compiled |
| The inlined mission locals | The pre-refactor file failed the same way |
