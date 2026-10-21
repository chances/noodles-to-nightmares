const storageKey = (project) => `mission-editor.node-selection:${project}`;

export function loadNodeSelection(storage, project) {
  try {
    const selection = JSON.parse(
      storage.getItem(storageKey(project)) ?? "null",
    );
    if (
      !selection || typeof selection.stem !== "string" ||
      !(selection.node === null || typeof selection.node === "string")
    ) return null;
    return { stem: selection.stem, node: selection.node };
  } catch {
    return null;
  }
}

export function saveNodeSelection(storage, project, selection) {
  try {
    storage.setItem(storageKey(project), JSON.stringify(selection));
  } catch {
    /* storage can be blocked; the selection still works until reload */
  }
}
