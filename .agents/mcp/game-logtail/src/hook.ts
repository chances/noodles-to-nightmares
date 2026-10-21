import { AlertStore } from "./alerts.ts";
import { ALERTS_PATH, STATE_PATH } from "./config.ts";
import { severityAtLeast } from "./rules.ts";

// Prompt-submit hook: prints open warn-or-worse alerts that no prompt has shown yet.
const store = new AlertStore(ALERTS_PATH, STATE_PATH);
const { shown } = await store.readState();
const open = (await store.list({ minSeverity: "warn" })).filter((alert) =>
  !shown.includes(alert.id) && severityAtLeast(alert.severity, "warn")
);

if (open.length > 0) {
  console.log(
    `Game log alerts (${open.length} new; handle, then call gamelog_ack_alerts):`,
  );
  for (const alert of open) {
    const pointer = alert.report
      ? ` See ${alert.report}.`
      : alert.hint
      ? ` ${alert.hint}`
      : "";
    console.log(
      `- [${alert.severity}] ${alert.title} (${alert.source}): ${alert.line}${pointer}`,
    );
  }
  await store.markShown(open.map((alert) => alert.id));
}
