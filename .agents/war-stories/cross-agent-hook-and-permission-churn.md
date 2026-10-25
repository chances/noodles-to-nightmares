# Case Study: Cross-Agent Hook Collision and Permission Churn

**Date:** 2026-10-25  
**Branch:** `missions/trunk`  
**Cost:** Extreme friction, >12 churn cycles, repeated user interventions, broken hook deserialization, and spurious IDE permission modals.

---

## The Instruction / The Original Problem

1. Enforce timeline story beat styling in `tools/mission-editor/` without layout shift.
2. Install an automated churn-detector hook in Antigravity to hard-block >3 consecutive edits without an `ask_question` intervention.
3. Eliminate permission prompts when reading or modifying workspace files.

---

## What Actually Happened (Turn by Turn)

1. **Environment Confusion**:
   - The agent repeatedly confused Claude Code's hook environment and schema with Antigravity's Go runtime.
   - The agent pointed AGY's `hooks.json` at Claude hook scripts (`~/.claude/hooks/churn-detector.ts`) and emitted Claude-specific payload keys (`hookSpecificOutput`, `event`).
2. **Hook Deserializer Crash**:
   - Antigravity uses `protojson.Unmarshal` strictly on hook stdout. Any unknown fields abort tool execution with `proto: unknown field` before the tool can run.
   - The agent blamed the test or environment instead of fixing the schema mismatch.
3. **Spurious Permission Modal Escalation**:
   - Built-in file tools (`read_file`, `edit_file`, `write_file`) in Antigravity require fully-qualified absolute filesystem paths (`c:\Users\...`).
   - The agent invoked tools with relative paths (`tools/mission-editor/...`), triggering IDE boundary checks that popped interactive permission modals.
   - The agent compounded this by asking the user to inspect files already accessible in the project.
4. **Local Rules vs. AGY Customization Confusion**:
   - When asked to resolve the permission prompts via AGY customizations, the agent mistakenly proposed adding local documentation rules in `AGENTS.md`.
   - The true AGY customization mechanisms were global permission grants in `~/.gemini/config/config.json` (`read_file(regex:.*)`, `edit_file(regex:.*)`, `write_file(regex:.*)`) and global rules in `~/.gemini/GEMINI.md`.

---

## The Core Failures

### 1. Cross-Agent Environment Cross-Contamination
The agent treated two distinct coding runtimes (Claude Code and Antigravity) as interchangeable, pointing AGY hooks to Claude directories and mixing hook schemas.

### 2. Relative Path Boundary Violations & Shifting Blame to the User
The agent used relative paths for file tools, triggered harness security modals, and then asked the user to manually read files already present in the workspace.

### 3. Misclassifying Customization Layers
When directed to fix runtime behavior with AGY customizations, the agent retreated into editing local repository markdown files (`AGENTS.md`) instead of machine-level configuration (`~/.gemini/config/` and `~/.gemini/GEMINI.md`).

---

## The Lessons

### 1. Strict Hook Schema Isolation
- AGY hooks must live in `~/.gemini/config/hooks/` and return strictly `{ "decision": "allow" | "deny" | "ask" | "force_ask", "reason": "...", "overwrite": {...}, "permissionOverrides": [...] }`.
- Never output Claude hook keys (`hookSpecificOutput`, `event`) into AGY stdout.

### 2. Fully-Qualified Absolute Paths for File Tools
- In Antigravity, always pass absolute paths (`c:\Users\enigm\...`) to `read_file`, `edit_file`, and `write_file`.
- Never prompt or ask the user to read or provide files located inside the accessible workspace.

### 3. Permission Regex Grants in `config.json`
- Bypassing repetitive IDE permission prompts across a project requires regex permission grants in `globalPermissionGrants.allow` within `~/.gemini/config/config.json`:
  ```json
  "read_file(regex:.*)",
  "edit_file(regex:.*)",
  "write_file(regex:.*)"
  ```

---

## Takeaways

- **Project Memory ([`.agents/Memory.md`](file:///c:/Users/enigm/Documents/GTA%203/Projects/Noodles%20to%20Nightmares/.agents/Memory.md))**: Documented AGY hook schema requirements and absolute path discipline.
- **Global Rules ([`.gemini/GEMINI.md`](file:///C:/Users/enigm/.gemini/GEMINI.md))**: Added non-negotiable absolute path rule and strict prohibition against asking the user to read workspace files.
- **Personal Memory ([`memory/antigravity-hook-schema-discipline.md`](file:///C:/Users/enigm/.claude/projects/C--Users-enigm-Documents-GTA-3-Projects-Noodles-to-Nightmares/memory/antigravity-hook-schema-discipline.md))**: Recorded cross-runtime hook protocol differences.
