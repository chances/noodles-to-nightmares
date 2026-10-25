// Starter mission templates for the mission editor.
//
// Each template conforms to `Mission` in `types.ts` and passes `problems.ts` with zero errors and zero warnings.

import type { Mission } from "./types.ts";

// @remarks An unknown template id falls back to the empty starter. The server's picklist validation rejects unknown ids before this point.

export const TEMPLATE_IDS = [
  "empty",
  "linear",
  "timed_chase",
  "delivery",
] as const;
export type TemplateId = typeof TEMPLATE_IDS[number];

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  create: (title?: string) => Mission;
}

function emptyTemplate(title = "A new mission"): Mission {
  return {
    header: [title],
    start: "INTRO",
    onFail: "LOSE",
    fail: [
      { test: "Player.IsDead($player)" },
      { test: "Player.HasBeenArrested($player)" },
    ],
    states: {
      INTRO: {
        kind: "tutorial",
        beats: [
          {
            do: [["Text.PrintString(\"Mission started.\", 3000)"]],
            wait: 1000,
          },
        ],
        next: "WIN",
      },
      WIN: {
        kind: "ending",
        fail: false,
        finish: true,
      },
      LOSE: {
        kind: "ending",
        fail: false,
        beats: [
          {
            do: [["Text.PrintBig('M_FAIL', 3500, TextStyle.Middle)"]],
            wait: 3000,
          },
        ],
        next: "INTRO",
      },
    },
  };
}

function linearTemplate(title = "Linear Story"): Mission {
  return {
    header: [title],
    start: "INTRO",
    onFail: "LOSE",
    fail: [
      { test: "Player.IsDead($player)" },
      { test: "Player.HasBeenArrested($player)" },
    ],
    states: {
      INTRO: {
        kind: "cutscene",
        beats: [
          {
            do: [["Text.PrintString(\"Wait here for instructions.\", 3000)"]],
            wait: 2000,
          },
        ],
        next: "GO_TO_DESTINATION",
      },
      GO_TO_DESTINATION: {
        kind: "objective",
        beats: [
          {
            do: [["Text.PrintString(\"Head to the rendezvous point.\", 4000)"]],
            wait: 1000,
          },
        ],
        until: [
          {
            test:
              "Player.LocateAnyMeans3D($player, 873.0, -309.0, 9.0, 4.0, 4.0, 4.0, true)",
          },
        ],
        next: "WIN",
      },
      WIN: {
        kind: "ending",
        fail: false,
        finish: true,
        beats: [
          {
            do: [
              ["Audio.PlayMissionPassedTune(1)"],
              [
                "Text.PrintWithNumberBig('M_PASS', 1000, 5000, TextStyle.Middle)",
              ],
            ],
            wait: 5000,
          },
        ],
      },
      LOSE: {
        kind: "ending",
        fail: false,
        beats: [
          {
            do: [["Text.PrintBig('M_FAIL', 3500, TextStyle.Middle)"]],
            wait: 3000,
          },
        ],
        next: "INTRO",
      },
    },
  };
}

function timedChaseTemplate(title = "Timed Chase"): Mission {
  return {
    header: [title],
    start: "INTRO",
    onFail: "LOSE",
    fail: [
      { test: "Player.IsDead($player)" },
      { test: "Player.HasBeenArrested($player)" },
    ],
    states: {
      INTRO: {
        kind: "tutorial",
        beats: [
          {
            do: [
              [
                "Text.PrintString(\"The target is escaping! Catch up before time runs out.\", 4000)",
              ],
            ],
            wait: 1000,
          },
        ],
        next: "CHASE",
      },
      CHASE: {
        kind: "encounter",
        timeLimit: 120,
        showTimer: true,
        beats: [
          {
            do: [["Text.PrintString(\"Stop the target!\", 3000)"]],
            wait: 500,
          },
        ],
        until: [
          {
            test:
              "Player.LocateAnyMeans3D($player, 1020.0, -450.0, 15.0, 6.0, 6.0, 6.0, true)",
          },
        ],
        next: "WIN",
      },
      WIN: {
        kind: "ending",
        fail: false,
        finish: true,
        beats: [
          {
            do: [
              ["Audio.PlayMissionPassedTune(1)"],
              [
                "Text.PrintWithNumberBig('M_PASS', 2500, 5000, TextStyle.Middle)",
              ],
            ],
            wait: 5000,
          },
        ],
      },
      LOSE: {
        kind: "ending",
        fail: false,
        beats: [
          {
            do: [["Text.PrintBig('M_FAIL', 3500, TextStyle.Middle)"]],
            wait: 3000,
          },
        ],
        next: "INTRO",
      },
    },
  };
}

function deliveryTemplate(title = "Delivery"): Mission {
  return {
    header: [title],
    start: "INTRO",
    onFail: "LOSE",
    fail: [
      { test: "Player.IsDead($player)" },
      { test: "Player.HasBeenArrested($player)" },
      {
        pre: ["wanted = 0", "01C0: wanted = player $player wanted_level"],
        test: "wanted > 0",
        locals: ["wanted"],
      },
    ],
    states: {
      INTRO: {
        kind: "tutorial",
        beats: [
          {
            do: [
              [
                "Text.PrintString(\"Collect the package and make the drop without police attention.\", 4000)",
              ],
            ],
            wait: 1000,
          },
        ],
        next: "PICKUP",
      },
      PICKUP: {
        kind: "interaction",
        beats: [
          {
            do: [["Text.PrintString(\"Collect the package.\", 3000)"]],
            wait: 1000,
          },
        ],
        until: [
          {
            test:
              "Player.LocateStoppedOnFoot3D($player, 873.0, -309.0, 9.0, 3.0, 3.0, 3.0, true)",
          },
        ],
        next: "DELIVERY",
      },
      DELIVERY: {
        kind: "objective",
        beats: [
          {
            do: [
              [
                "Text.PrintString(\"Deliver the package without getting caught!\", 3500)",
              ],
            ],
            wait: 1000,
          },
        ],
        until: [
          {
            test:
              "Player.LocateStoppedOnFoot3D($player, 1145.0, -620.0, 15.0, 4.0, 4.0, 4.0, true)",
          },
        ],
        next: "WIN",
      },
      WIN: {
        kind: "ending",
        fail: false,
        finish: true,
        beats: [
          {
            do: [
              ["Audio.PlayMissionPassedTune(1)"],
              [
                "Text.PrintWithNumberBig('M_PASS', 1500, 5000, TextStyle.Middle)",
              ],
            ],
            wait: 5000,
          },
        ],
      },
      LOSE: {
        kind: "ending",
        fail: false,
        beats: [
          {
            do: [["Text.PrintBig('M_FAIL', 3500, TextStyle.Middle)"]],
            wait: 3000,
          },
        ],
        next: "INTRO",
      },
    },
  };
}

export const TEMPLATES: Record<TemplateId, TemplateInfo> = {
  empty: {
    id: "empty",
    name: "Empty Starter",
    description: "A minimal mission with one start state and one win state.",
    create: emptyTemplate,
  },
  linear: {
    id: "linear",
    name: "Linear Story",
    description:
      "A three-state progression: wait for instructions, travel to a spot, and finish.",
    create: linearTemplate,
  },
  timed_chase: {
    id: "timed_chase",
    name: "Timed Chase",
    description:
      "A timed pursuit with a HUD countdown clock and mission failure on timeout or arrest.",
    create: timedChaseTemplate,
  },
  delivery: {
    id: "delivery",
    name: "Delivery",
    description:
      "Pick up cargo, navigate to the drop-off spot, and avoid wanted stars.",
    create: deliveryTemplate,
  },
};

export function createMissionFromTemplate(
  templateId: TemplateId = "empty",
  title?: string,
): Mission {
  const info = TEMPLATES[templateId] ?? TEMPLATES.empty;
  return info.create(title);
}
