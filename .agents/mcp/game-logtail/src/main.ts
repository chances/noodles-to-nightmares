import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AlertStore } from "./alerts.ts";
import {
  ALERTS_PATH,
  gameDir,
  LOG_SOURCES,
  RULES_PATH,
  STATE_PATH,
} from "./config.ts";
import { Monitor } from "./monitor.ts";
import { loadRules } from "./rules.ts";
import { registerTools } from "./tools.ts";

const rules = await loadRules(
  RULES_PATH,
  LOG_SOURCES.map((source) => source.id),
);
const store = new AlertStore(ALERTS_PATH, STATE_PATH);
const monitor = new Monitor(gameDir(), rules, store);

await monitor.init();
monitor.start();

const server = new McpServer({
  name: "game-logtail-mcp-server",
  version: "0.1.0",
});
registerTools(server, monitor, store);

await server.connect(new StdioServerTransport());
console.error(
  `game-logtail ready: session ${monitor.session}, ${rules.length} rules`,
);
