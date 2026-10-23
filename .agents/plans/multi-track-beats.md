# Multi-Track Beats

A state's beats become a grid: story beats across, actors down. It extends the beat table in [lib/fsm](../../lib/fsm) and the timeline in the [Mission Editor section](../Memory.md#mission-editor). Future work; nothing here is built.

## Findings

| Source | Fact | Use Here |
| --- | --- | --- |
| `lib/fsm/generate.ts` | A state runs one `beat` counter and one `TIMERA`; a beat has a run phase and a wait phase | Lockstep columns keep one counter and one timer for any number of rows |
| [lib/fsm](../../lib/fsm) | A mission has 16 locals; `state`, `beat`, each latch, and each scratch read use one | Each non-player actor handle is one more local |
| CLEO | A script has two timers, `TIMERA` and `TIMERB` | Independent per-row clocks do not scale past two rows, so rows do not get their own clock |

## Decisions

| Topic | Decision |
| --- | --- |
| Row | One row per actor, plus a fixed `Direction` row for camera, fades, HUD, and audio that belong to no character. `Direction` is first, then actors in declared order |
| Actors | A mission-level `actors` list by name. `Rosa` is always `$player` and needs no declaration; switching player actors is out of scope. Other actors get a generator-reserved ped handle, and the Assets pane's characters supply the model |
| Sync | Lockstep. Each story beat is a column; every row starts it together, and it ends when the longest active cell ends |
| Opt-out | A cell with `background: true` runs its steps at column start and adds nothing to the column's length |
| X-axis | Story beats. A column has a number, an optional `title` you write, and a width proportional to its length (with a floor so an instant beat stays visible). There are no second ticks |
| Cell | The same fields a beat has today: `notes`, `when`, `do`, `wait`, plus `background` |
| `when` | On a column (skips the whole story beat, wait included), on a cell (skips that cell; it adds no wait), or both |
| Today's `beats` | Stays valid. A state with `beats` is columns with only `Direction` cells, one beat per column; mission 0's generated Sanny stays byte-identical. A state has `beats` or `columns`, never both |
| Editing | Read-only first, like milestone 1: the timeline draws the grid, and the Inspector shows the selected column or cell. Editing follows the editor's later phases |

## Data Shape

```ts
interface Cell {
  notes?: string[];
  when?: Cond[];
  do?: Step[];
  wait?: number;
  /** Runs at column start; does not hold the column open. */
  background?: boolean;
}

interface Column {
  title?: string;
  notes?: string[];
  when?: Cond[];
  /** `direction` or an actor name; a missing row is an empty cell. */
  cells: Record<string, Cell>;
}

interface Mission {
  /** Actors other than Rosa (`$player`). */
  actors?: Record<string, { model?: string }>;
}

interface State {
  beats?: Beat[]; // one row, `Direction`
  columns?: Column[]; // the grid
}
```

`.fsm.json` stores the same shapes. Step builders that need a ped declare it, and the row's actor handle fills it in.

## Generator

- Column `n` has a run phase and a wait phase, as a beat does today. The run phase starts each active cell: its `when` holds and it is not skipped by the column's `when`.
- The wait phase passes when `TIMERA` reaches the longest active, non-background cell wait. A column with no conditional cells uses the static maximum.
- A column whose longest cell is conditional sets a `hold` local in the run phase (`if hold < wait then hold = wait`); that is the only extra local besides actor handles.
- Rejections: a state with both `beats` and `columns`, a cell on an undeclared actor, and more than 16 locals once actor handles are counted.

## Timeline

- Rows are layers: a name column on the left (`Direction`, then each actor), a column header on top (number, title, length), one frame cell per row and column.
- A cell is a keyframe dot at the column start and a bar for its `wait`. The bar can be shorter than the column; the gap is the actor idle. A background cell is a hollow, dashed bar with no length. A conditional cell has a dashed edge, and a column `when` is a badge in its header.
- A state with only `beats` shows one row, `Direction`, as it does now.
- Pan, zoom, the fixed heading bar, and the sticky name column and header follow the current timeline.

## Open Items

- Whether the Assets pane's characters can fill an actor's `model`, or the mission declares it with a `consts` entry.
- A `background` cell that outlives its column (a long walk) has no end marker; whether to draw one from the cell's `wait`.
- A mission with many actors may need handles in globals through `Alloc` rather than locals.
