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
  // MCP Streamable HTTP defines GET for SSE (server-push notifications) and
  // DELETE for session teardown, but this Vercel deployment is stateless — no
  // long-lived connections, no sessions. Clients (e.g. Claude mobile) send a
  // GET to probe for SSE support; the 405 tells them it's unavailable and they
  // gracefully fall back to POST-only mode. This is expected and harmless.
  if (req.method !== "POST") {
    console.log(`MCP ${req.method} rejected (405) — this stateless server does not support SSE push notifications`);
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
