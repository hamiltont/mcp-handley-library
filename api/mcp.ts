/**
 * Vercel serverless function for the MCP endpoint.
 *
 * Runs in stateless mode: each POST creates a fresh transport, handles
 * the request, and tears down. No sessions, no SSE, no in-memory state.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "../src/server.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only POST is supported in stateless mode
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Method Not Allowed. Use POST." },
      id: null,
    });
    return;
  }

  try {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    await transport.close();
    await server.close();
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
}
