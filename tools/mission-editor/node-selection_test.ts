import { assertEquals } from "@std/assert";
import { loadNodeSelection, saveNodeSelection } from "./ui/node-selection.js";

class MemoryStorage {
  values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

Deno.test("node selection survives reloads and stays project-scoped", () => {
  const storage = new MemoryStorage();
  const selection = { stem: "0_tutorial", node: "GO_HOME" };

  saveNodeSelection(storage, "project-a", selection);

  assertEquals(loadNodeSelection(storage, "project-a"), selection);
  assertEquals(loadNodeSelection(storage, "project-b"), null);
});
