// See https://github.com/bartlomieju/denidian an example Deno desktop app
import { createApp, defaultDirs } from "./server.ts";

// `deno desktop` keeps the process alive while Deno.serve() runs, so a closed window would leave the app
// running with no window. The first BrowserWindow adopts the app's window; quit when it closes.
const desktop = Deno as unknown as {
  BrowserWindow?: new (options?: {}) => EventTarget;
};
if (desktop.BrowserWindow) {
  const win = new desktop.BrowserWindow({
    title: "Mission Editor",
    width: 1024,
    height: 768,
  });
  win.addEventListener("close", () => Deno.exit(0));
}

Deno.serve(createApp(defaultDirs(), { log: true }).fetch);
