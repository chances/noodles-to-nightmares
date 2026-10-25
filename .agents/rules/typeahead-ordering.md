# Typeahead Suggestion Order

- **Enum Members First**: A typeahead whose field names a Sanny enum (`enum` on the field) lists that enum's members before anything else, in the enum's own index order. Never re-sort them alphabetically, because the index is the game's id order.
- **Current Mission Next**: After any enum members, values declared in the current mission come first: its locals and its mission-local constants. Each run is sorted as below.
- **Prefix Matches Next**: Among the other suggestions, names that start with the query's first word come before names that only contain it.
- **Alphabetize the Rest**: Within each run, sort by name, case-insensitively, with numbers in numeric order (`Blip2` before `Blip10`). With an empty query, every non-enum suggestion is alphabetized.
- **One Place**: `filterOptions` in `tools/mission-editor/ui/templates.js` applies these rules for every combo. Options carry `enumIndex` when they come from an enum (`enumOptions`), and a builder never sorts on its own.
- **Tests**: `tools/mission-editor/templates_test.ts` pins each rule. Add a case there before changing the order.
