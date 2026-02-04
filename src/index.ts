/**
 * Entry point for the Handley Library MCP Server
 * Supports both stdio and HTTP transports
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const isHttpMode = process.argv.includes("--http");

async function main(): Promise<void> {
  const server = createServer();

  if (isHttpMode) {
    // HTTP transport mode - import dynamically to avoid loading Express for stdio mode
    const { startHttpServer } = await import("./http.js");
    await startHttpServer(server);
  } else {
    // stdio transport mode (default)
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Handley Library MCP server running on stdio");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
