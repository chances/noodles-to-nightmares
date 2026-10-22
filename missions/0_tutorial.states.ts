import { cond, defineMission, poiRadius, poiSpot, step } from "@noodles/fsm";

const SAFEHOUSE = poiSpot("SAFEHOUSE");





export default defineMission({
  header: [
    "Teach the player how to follow instructions",
  ],
  consts: { REWARD: [250, "Rosa's paycheck"] },
  start: "INTRO",
  onFail: "LOSE",
  fail: [cond.playerDead(), cond.playerBusted()],
  monitors: [
    {
      id: "driveHint",
      when: [cond.playerSittingInCar(), cond.playerInCar()],
      once: [step.help("Drive safe."), step.rememberPlayerCar()],
    },
    {
      id: "dyingWarning",
      when: [cond.healthBelow(45)],
      // Remind the player not to die
      once: [step.help("Don't you ~r~dare ~w~die!")],
    },
  ],
  states: {
    INTRO: {
      beats: [
        { wait: 5000 },
        {
          do: [
            step.say("Fuck me, that shift was long. I reek of noodles.", 3500),
          ],
          wait: 4000,
        },
        {
          do: [step.title("The Carpool Shortcut", 5000, "BottomRight")],
          wait: 7500,
        },
        {
          do: [step.say("The sooner I'm home in bed, the better.", 3000)],
          wait: 3000,
        },
        {
          // Flash Rosa's apartment blip
          do: [
            step.blipAt(
              "$SafeBlip",
              SAFEHOUSE,
              "Savehouse",
            ),
            step.help("This map will guide you around town."),
            step.radarFlash(true),
          ],
          wait: 3000,
        },
        { do: [step.radarFlash(false)], wait: 2500 },
      ],
      next: "GO_HOME",
    },

    GO_HOME: {
      notes: ["QUESTION: Why is Rosa's apartment collision not correct?"],
      // Thus far, Rosa's primary form of travel is on-foot.
      onEnter: [
        step.when([cond.latchClear("driveHint")], [
          step.help("Find your way home."),
        ]),
      ],
      until: [
        cond.playerNear3D(
          poiSpot("SAFEHOUSE_ARRIVE"),
          poiRadius("SAFEHOUSE_ARRIVE"),
        ),
      ],
      next: "ARRIVE",
    },

    ARRIVE: {
      fail: false,
      beats: [
        {
          do: [
            step.cameraAtPlayer(
              [
                "PAYPHONE_CALL_CAM_X",
                "PAYPHONE_CALL_CAM_Y",
                "PAYPHONE_CALL_CAM_Z",
              ],
              1250,
            ),
          ],
        },
        {
          when: [cond.latchClear("driveHint")],
          do: [step.say("Ugh, that was a long walk.", 2500)],
          wait: 2500,
        },
        {
          notes: [
            "Mission Passed!",
            'TODO: Save the player\'s car in this "garage".',
            "TODO: Add parking lines to the model. See Marco's Bistro for parking lines",
          ],
          do: [
            step.passTune(),
            step.registerPassed("NooM_0"),
            step.addScore("REWARD"),
            step.passBanner("REWARD"),
          ],
          wait: 5500,
        },
      ],
      next: "HOME_TUTORIAL",
    },

    HOME_TUTORIAL: {
      fail: false,
      notes: ["Payphone and front-door tutorial"],
      beats: [
        { do: [step.help("This is your home.")], wait: 3000 },
        {
          do: [step.help("Come back here anytime to save the game.")],
          wait: 4000,
        },
        {
          notes: ["All done!"],
          do: [step.fade(750, "Out"), step.loadSplash("SPLASH1")],
          wait: 1250,
        },
        {
          notes: ["TODO: Model and then teleport to Rosa's apartment unit"],
          do: [step.restoreJumpcut(), step.fade(750, "In")],
          wait: 1000,
        },
        {
          do: [step.say("TGIF! I really needed that rent money.", 3250)],
          wait: 7500,
        },
      ],
      next: "WIN",
    },

    WIN: { fail: false, finish: true },

    LOSE: {
      fail: false,
      resetLatches: true,
      beats: [{ do: [step.failBanner()], wait: 3000 }],
      next: "GO_HOME",
    },
  },
});
