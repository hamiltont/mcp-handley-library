/**
 * MCP Server instance for Handley Library catalog
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchTool } from "./tools/search.js";
import { registerAvailabilityTool } from "./tools/availability.js";
import { registerDetailsTool } from "./tools/details.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "handley-library",
    version: "1.0.0",
  });

  // Register all tools
  registerSearchTool(server);
  registerAvailabilityTool(server);
  registerDetailsTool(server);

  return server;
}
