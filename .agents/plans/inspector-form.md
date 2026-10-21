# Inspector Form

The Inspector becomes an editable form for the selected state, or for the mission when nothing is selected. It follows [mission-editor.md](mission-editor.md) (dynamic forms, autosave, commands with mementos, validation) and today's read-only [inspector-pane.js](../../tools/mission-editor/ui/inspector-pane.js).

## Findings

| Source | Fact | Use Here |
| --- | --- | --- |
| `missions/0_tutorial.states.ts` | `INTRO`, `ARRIVE`, `HOME_TUTORIAL`, and `LOSE` are beats then `next`; `GO_HOME` is enter steps, `until`, `next`; `WIN` is `finish` | Cutscene, Objective, and Ending kinds |
| `missions/1_shady_job.txt` | Wait to be near a payphone; wait for `Player.IsLiftingAPhone`; collect a pickup; deliver to a zone; a skippable cutscene (`$skipCutscene`); `tryRemoveSal` cleanup | Interaction kind; skippable is a cutscene option; cleanup is a monitor |
| `missions/side_supply_run.txt` | Toll and chase stages with spawned gang and thief, extra fail checks, `TIME_LIMIT` over several stages, 250 or 125 reward by choice | Encounter, Choice, and time-limit decisions |
| `missions/2_proving_herself.md` | Combat trigger, enemy spawning, chase or retreat | Encounter kind |
| Today's Inspector | Read-only sections: Flow, Fail Check, Enter and Exit Steps, Monitor Latches, Beats, Notes | The form's section set |

## Decisions

| Topic | Decision |
| --- | --- |
| Form | A skeleton plus an Add Section menu. A state shows only the sections it has; the kind sets which sections a new state starts with |
| Selection | A state shows its form; nothing selected shows the Mission form (header, constants, fail conditions, monitors and hints, timers, includes) |
| Kind | Optional `kind` on a state; inferred from the sections present when absent, and written the first time you change it. A select beside the name changes it, offering the new kind's default sections and keeping the ones you filled |
| Kinds | `cutscene`, `tutorial` (timed help with player control, guided with control off, and the cross-state teaching overlay, which is a mission monitor), `objective`, `interaction`, `encounter`, `choice`, `ending` |
| Default sections | See the table below |
| Rename | A subtle icon button beside the name and role pills swaps the title for an inline text field. `UPPER_SNAKE_CASE` only; a duplicate or bad name shows an inline error. Committing renames every `next`, `goto`, `start`, and `onFail` |
| Steps and conditions | Typed controls built from the vocabulary descriptors in `lib/fsm`, with an Edit As Sanny toggle to the raw lines. A step the vocabulary does not know shows only the text box |
| Commit | Every keystroke, debounced; each commit is one command with a memento, and undo steps merge by time |
| Reward | A Reward section on an Ending: an amount (a `consts` name or a number) that generates the pass tune, `register_mission_passed`, score, and banner. Branches reach the ending they earn |
| Time limit | Both: a mission timer over a state range (limit, start state, end state, fail state; one local) and a per-state limit that counts from entering that state |
| Problems | A red or yellow Problems pill in the app header. Click toggles a Problems overlay panel. Hard errors disable Export; the Export dialog lists every problem. Messages also show inline under the field at fault |
| Delete | A danger-colored trash icon in the title bar; one confirm dialog names the state and the transitions that point at it |

### Default Sections By Kind

| Kind | Sections |
| --- | --- |
| Cutscene | Beats, Flow (Next), Fail Check |
| Tutorial | Beats of help steps, Control (on or off), Flow (Next) |
| Objective | Enter Steps, Condition, Flow (Next), Fail Check |
| Interaction | Spot, Condition, Flow (Next), Fail Check |
| Encounter | Spawns, Enter Steps, Branches (beaten, escaped, failed), Fail Check |
| Choice | Prompt, Branches (condition and next, one per option) |
| Ending | Reward, Beats |

## Phasing

- First: the skeleton, the Mission form, rename, delete, the problems pill, and the sections the generator already supports (Identity, Flow, Fail Check, Enter and Exit Steps, Beats, Notes, Latches). Kinds only choose default sections.
- Later, each with generator support: Spawns, Reward, Time Limit (state and mission), Control, Prompt, Spot.
- Multi-track beats ([multi-track-beats.md](multi-track-beats.md)) change the Beats section into the column grid once built.

## Open Items

- Which condition and step descriptors the first form must cover; mission 0 needs `playerNear3D`, `latchClear`, `say`, `title`, `help`, `blipAt`, `radarFlash`, camera, fade, and the pass steps.
- Whether `kind` shows in the graph (a card color or icon) or only in the Inspector.
- Where Spot and Spawns positions come from: the `utils/geography.txt` list in the Assets pane, or typed coordinates.
