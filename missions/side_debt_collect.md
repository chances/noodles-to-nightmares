---
title: The Squeeze
kind: side mission
act: One
script_file: side_debt_collect.txt
status: Stub
location: Portland
reward: $200
objective: >-
  A street-level loan shark hires Rosa to collect a debt from a local business
  owner. Rosa intimidates and collects payment.
mechanics:
  - Dialogue-driven intimidation (player chooses threat level)
  - Combat if intimidation fails
  - Money pickup and return
teaching_points:
  - Dialogue consequences
  - Non-combat problem-solving
  - NPC relationships
---

# Side Mission: The Squeeze

Story script for [`side_debt_collect.txt`](side_debt_collect.txt). An optional Portland mission in [Act One: The Setup](../story/act-one.md).

## Script

No dialogue is written yet. The beats below come from the objective.

**EXT. PORTLAND STREET - DAY**

A street-level LOAN SHARK hires Rosa to collect a debt from a local business owner.

**[GAMEPLAY]** Rosa travels to the business.

**INT. BUSINESS OWNER'S SHOP, PORTLAND - DAY**

Rosa confronts the BUSINESS OWNER.

**[GAMEPLAY]** The player chooses a threat level. Intimidation can succeed and the owner pays; if it fails, combat starts.

**EXT. PORTLAND STREET - DAY**

**[GAMEPLAY]** Rosa picks up the money and returns it to the loan shark.

**[MISSION PASSED]** $200.
