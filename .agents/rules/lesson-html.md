---
name: lesson-html
description: Standards for teaching lesson HTML in .agents/lessons: light and dark themes, quiz answers, headings, and how to preview.
trigger: model_decision
---

# Lesson HTML Standards

- **Location**: lessons live in `.agents/lessons/NNNN-kebab-case-name.html`.
- **Color scheme**: every lesson supports light and dark. Define colors as tokens on `:root`, override them under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and under `:root[data-theme="dark"]`. A fixed Theme button sets `data-theme` and stores it in `localStorage` inside `try/catch`.
- **Preview**: the built-in Browser pane renders `file://` pages light and ignores color scheme emulation. Serve lessons with the `lessons` entry in `.claude/launch.json` (`http://localhost:8123/<file>.html`) to see the media query work.
- **Quiz options**: options have equal length and carry no descriptive label that names the answer. The question tests recall of a lesson table or rule, not reading the options. Do not place the correct option first.
- **Try It widgets**: every input saves its value to `sessionStorage` (key `lesson-<number>-<input>`) inside `try/catch` and restores it on load, validated against the input's range. The page works with storage unavailable.
- **Caveats**: write every caveat as `<blockquote class="callout" data-variant="note|tip|warning|danger">` and link `assets/callout.css`. The emoji icon comes from `::before`, keyed on `data-variant`.
- **Headings and buttons**: Title Case, per the global convention.
