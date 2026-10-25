# Regression Prevention & Churn Ceiling

- **Strict 3-Turn Churn Limit**: If three (3) consecutive attempts or turns on any visual, layout, or behavioral fix result in regressions or user dissatisfaction, **STOP IMMEDIATELY**. Do not make a fourth guess or trial-and-error edit.
- **Mandatory Escalation via `ask_question`**: Upon reaching the 3-turn limit, the agent MUST invoke the `ask_question` tool to present the user with structured choices, trade-offs, or request specific design clarification.
- **Invariant Audit Before File Edits**: Before making any styling or layout edit, review the invariants established over recent turns (e.g., element dimensions, padding, optical centering, border widths). Verify that the proposed replacement preserves every previously established invariant.
- **Box-Model Stability Invariant**: When adjusting borders or pseudo-elements on existing components, never alter the CSS `border-width` or `padding` of the host element if doing so shifts interior text, child icons, or sibling dots.
