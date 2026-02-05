/**
 * MCP Server instance for Handley Library catalog
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchCatalogTool } from "./tools/search-catalog.js";
import { registerFindOnShelfTool } from "./tools/find-on-shelf.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "handley-library",
    version: "1.0.0",
  });

  // Register all tools
  registerSearchCatalogTool(server); // Planning mode: holds and availability checking
  registerFindOnShelfTool(server);   // Real-time mode: shelf navigation at branch

  return server;
}
