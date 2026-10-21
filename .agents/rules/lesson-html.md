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
- **Quiz feedback**: a wrong-answer message points at content the lesson contains. Never say "reread section N" unless section N states the answer.
- **Quiz colors**: every quiz links `assets/quiz.css`. Wrap the options in `<div class="quiz">` followed by `<p class="result">`. The script adds `ok` or `bad` to the clicked button and to the result paragraph, which shows green or red feedback.
- **Quiz answer position**: the correct option's position never repeats between adjacent questions, and is never first.
- **Lessons are not bug reports**: a lesson teaches the concept. Symptoms, root causes, in-game tests, and ruled-out candidates go in `.agents/reports/bugs/<bug-name>.md`, and the lesson links the report.
- **No open caveats**: a limit or behavior the lesson calls untested is tested before the lesson ships (for Sanny syntax, compile it with `scripts/test-sanny-locals.ts` as the pattern), and the lesson states the result.
- **Index titles**: each entry in `lessons/index.html` uses the same text as the page's `<title>`.
- **Options**: alternatives such as Option A and Option B are `h3` subheadings in Title Case, styled apart from the numbered `h2` sections (smaller sans-serif type, accent color, inline-start accent border).
- **Try It widgets**: every input saves its value to `sessionStorage` (key `lesson-<number>-<input>`) inside `try/catch` and restores it on load, validated against the input's range. The page works with storage unavailable.
- **Caveats**: write every caveat as `<blockquote class="callout" data-variant="note|tip|warning|danger">` and link `assets/callout.css`. The emoji icon comes from `::before`, keyed on `data-variant`.
- **Question sections**: a section that answers a `QUESTION` comment from the code starts its heading with ❓ (`<h2>4. ❓ Why Can't …?</h2>`). Never prefix a lesson heading with "QUESTION:".
- **Headings and buttons**: Title Case, per the global convention.
