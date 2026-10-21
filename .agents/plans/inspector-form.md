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
| Name | The pane is titled Script, the scripting interface for the selected state or the mission |
| Beats | Not a Script section. A Beat pane sits right of the timeline, under the Script pane and as wide as it, and edits one beat: Duration, Only If conditions, Steps, and Notes. A click on a timeline card or dot picks the beat (a state starts at its first); `+` on the Beat heading adds one after the shown beat; the pane bar reorders or removes it. Kinds that script beats (cutscene, tutorial, ending) therefore add no Script section |
| Form | A skeleton plus an Add Section menu. A state shows only the sections it has; the kind sets which sections a new state starts with |
| Selection | A state shows its form; nothing selected shows the Mission form (header, constants, fail conditions, monitors and hints, timers, includes) |
| Kind | Optional `kind` on a state; inferred from the sections present when absent, and written the first time you change it. A select beside the name changes it, offering the new kind's default sections and keeping the ones you filled |
| Kinds | `cutscene`, `tutorial` (timed help with player control, guided with control off, and the cross-state teaching overlay, which is a mission monitor), `objective`, `interaction`, `encounter`, `choice`, `ending` |
| Default sections | See the table below |
| Rename | A subtle icon button beside the name and role pills swaps the title for an inline text field. Typing is rewritten to `UPPER_SNAKE_CASE`; only an empty or duplicate name shows an inline error. Committing renames every `next`, `goto`, `start`, and `onFail` |
| Steps and conditions | Typed controls built from the vocabulary descriptors in `lib/fsm`, with an Edit As Sanny toggle to the raw lines. A conditional (`step.when`) is a Conditional Steps control: conditions, a Then list, and an Otherwise list, nesting to any depth; `parseWhen` and `buildWhen` in `ui/templates.js` read and write its lines. A step the vocabulary does not know shows only the text box. A step list's add control is a split button: the main `Add Condition` button adds a Conditional Steps control, and the chevron menu lists the typed steps by group plus a Custom group with Sanny Builder (a JavaScript/TypeScript item for CLEO JS is a `TODO` in `ui/step-controls.js`). A condition list keeps its select, filled from a library of conditions the scripts use (position, input, vehicle, and world checks beside the player ones) |
| Commit | Every keystroke, debounced; each commit is one command with a memento, and undo steps merge by time |
| Reward | A Reward section on an Ending: an amount (a `consts` name or a number) that generates the pass tune, `register_mission_passed`, score, and banner. Branches reach the ending they earn |
| Time limit | Both: a mission timer over a state range (limit, start state, end state, fail state; one local) and a per-state limit that counts from entering that state |
| Problems | A red or yellow Problems pill in the app header. Click toggles a Problems overlay panel. The Export button stays clickable; its dialog lists every problem and says errors block the export itself. A state's own problems also show at the top of its form. A failed save is the first problem |
| Add State | A `+` icon button on the States heading opens a modal with Name, Kind, and one row `Comes After → new state → Leads To`. Comes After starts as the selected state and Leads To follows that state's Next until changed by hand; the new state is inserted between them, or finishes the mission, or leads nowhere. An empty choice shows a muted placeholder (`Nothing`, `Nowhere`), and an empty name is reported when Add State is pressed. The default layout re-runs for every node, then the new state is selected with its kind's sections open |
| Delete | A danger-colored trash icon in the title bar; one confirm dialog names the state and the transitions that point at it. The start and fail states cannot be deleted; deleting clears the `next` and branches that pointed at it |

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

- Phase 1, complete: the skeleton, the Mission form (file comment, start and fail states, constants, fail conditions, monitors, includes), Add State, rename, delete, the problems pill and panel, typed step and condition controls, all Inspector sections supported by the generator (Flow, Fail Check, Enter and Exit Steps, Wait Until, Branches, Notes, Reset Monitors), and the Beat pane. Kinds only choose default sections.
- Future feature slices pair generator support with their Inspector sections: Spawns, Reward, Time Limit (state and mission), Control, Prompt, and Spot.
- Multi-track beats ([multi-track-beats.md](multi-track-beats.md)) change the Beat pane into the column grid once built.

## Open Items

- Mission timers (the Mission form's last planned section) wait on generator support.
- Whether `kind` shows in the graph (a card color or icon) or only in the Inspector.
- Where Spot and Spawns positions come from: the `utils/geography.txt` list in the Assets pane, or typed coordinates.
