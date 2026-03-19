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
  // Only POST carries JSON-RPC; log non-POST requests with extra detail
  // so we can understand what the MCP client is probing for.
  if (req.method !== "POST") {
    console.log(
      `MCP ${req.method} (non-POST) | url=${req.url} | accept=${req.headers.accept ?? "none"} | ` +
      `content-type=${req.headers["content-type"] ?? "none"} | ` +
      `user-agent=${req.headers["user-agent"] ?? "none"} | ` +
      `headers=${JSON.stringify(Object.keys(req.headers))} | ` +
      `query=${JSON.stringify(req.query)} | ` +
      `body=${JSON.stringify(req.body) ?? "undefined"}`
    );
    res.setHeader("Allow", "POST");
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Method Not Allowed. Use POST." },
      id: null,
    });
    return;
  }

  // Log summary as last line (most visible on Vercel)
  const body = req.body;
  const rpcMethod = Array.isArray(body)
    ? body.map((r: any) => r.method).join(", ")
    : body?.method || "unknown";
  const rpcId = Array.isArray(body)
    ? body.map((r: any) => r.id).join(", ")
    : body?.id;
  console.log(`MCP ${req.method} | method=${rpcMethod} id=${rpcId}`);

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
