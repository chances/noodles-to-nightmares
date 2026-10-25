// Mission state machines: the table types, the step and condition vocabulary, and the Sanny generator.

export { cmp, ifBlock, INDENT, indent, latchLocal } from "./emit.ts";
export {
  condDescriptors,
  FIELD_PATTERNS,
  fieldPattern,
  stepDescriptors,
} from "./descriptors.ts";
export type {
  CondDescriptor,
  Descriptor,
  Field,
  FieldType,
  StepDescriptor,
} from "./descriptors.ts";
export {
  assertReferences,
  docFromMission,
  listMissions,
  loadMission,
  parseFsmDoc,
  saveMission,
} from "./fsm-file.ts";
export type { FsmDoc, MissionSource } from "./fsm-file.ts";
export { generate } from "./generate.ts";
export { cutsceneRegions, layout, NODE, transitions } from "./graph.ts";
export type { Edge, Point } from "./graph.ts";
export { problems } from "./problems.ts";
export type { ConstInfo, GlobalInfo, Known, Problem } from "./problems.ts";
export { listNames, loadKnown, parseConsts, parseGlobals } from "./known.ts";
export { floatLiteral, kindOfLiteral } from "./numeric.ts";
export type { NumberKind } from "./numeric.ts";
export { syncMissions } from "./sync.ts";
export type { SyncResult } from "./sync.ts";
export {
  createMissionFromTemplate,
  TEMPLATE_IDS,
  TEMPLATES,
} from "./templates.ts";
export type { TemplateId, TemplateInfo } from "./templates.ts";
export { defineMission, STATE_KINDS } from "./types.ts";
export type {
  Beat,
  Cond,
  Const,
  Local,
  Mission,
  Monitor,
  State,
  StateKind,
  Step,
} from "./types.ts";
export { cond, step } from "./vocabulary.ts";
export type { Expr, Spot, Spot2D } from "./vocabulary.ts";
export {
  generateGeographyTxt,
  GEOGRAPHY,
  getPoi,
  poiRadius,
  poiSpot,
} from "./geography.ts";
export type { GeoPoi } from "./geography.ts";
export { enumsFor } from "./enums.ts";
export type { EnumMember, Game } from "./enums.ts";
