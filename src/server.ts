/**
 * MCP Server instance for Handley Library catalog
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFindBooksTool } from "./tools/find-books.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "handley-library",
    version: "1.0.0",
  });

  // Register all tools
  registerFindBooksTool(server);

  return server;
}
