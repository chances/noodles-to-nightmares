/** A mission's file name as a label: `missions\1_shady_job.txt` and `1_shady_job` both read "Shady Job". */
export function missionLabel(name) {
  const base = name.split(/[\\/]/).pop().replace(
    /\.(states\.ts|fsm\.json|txt|md)$/,
    "",
  );
  const words = base.replace(/^\d+[_-]/, "").split(/[_-]+/).filter(Boolean);
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}
