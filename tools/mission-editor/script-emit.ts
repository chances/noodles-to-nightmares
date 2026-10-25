// Writes a mission's Sanny `.txt` after an autosave. A table with an error lint keeps the `.txt` it had, and saves
// within `delayMs` of each other coalesce into one write of the last table.

import { generate } from "@noodles/fsm";
import type { Mission, Problem } from "@noodles/fsm";

export class ScriptWriter {
  readonly #emit: (stem: string, text: string) => Promise<void>;
  readonly #delayMs: number;
  readonly #queued = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    emit: (stem: string, text: string) => Promise<void>,
    delayMs = 1000,
  ) {
    this.#emit = emit;
    this.#delayMs = delayMs;
  }

  /** Queues a write of `stem`'s `.txt` from this table. A save with an error lint cancels the write still queued. */
  schedule(
    stem: string,
    source: string,
    mission: Mission,
    problems: Problem[],
  ): void {
    clearTimeout(this.#queued.get(stem));
    this.#queued.delete(stem);
    if (problems.some((problem) => problem.severity === "error")) return;
    this.#queued.set(
      stem,
      setTimeout(() => {
        this.#queued.delete(stem);
        const text = generate(mission, `missions/${stem}.${source}`);
        this.#emit(stem, text).catch((error) => {
          console.error(`Could not write missions/${stem}.txt`, error);
        });
      }, this.#delayMs),
    );
  }
}
