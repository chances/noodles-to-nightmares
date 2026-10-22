# Code Editing and Structural Block Counting

- **No Line-Ending Speculation on Edit Failures**: When a file edit tool fails to match a target or triggers syntax errors, NEVER blame or hypothesize about CRLF/LF line-endings.
- **Count Blocks & Brackets Directly**: Always trace and count structural blocks (opening/closing braces `{}`, parentheses `()`, and template/component tags `<//>`), verify exact indentation, and ensure statement termination (semicolons).
- **Match Exact Single Lines**: When editing code where surrounding whitespace or multiline indentation is ambiguous, anchor edits to unique single lines rather than guessing multiline whitespace spans.
