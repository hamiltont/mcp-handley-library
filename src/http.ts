/**
 * HTTP transport for the MCP server using Streamable HTTP
 *
 * Includes rubber-stamp OAuth endpoints so that clients like ChatGPT (which
 * require OAuth discovery + dynamic client registration) can connect.
 * No access control is enforced — the /mcp endpoint is fully open.
 * See src/oauth.ts for the full disclaimer.
 */

import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { createOAuthRouter } from "./oauth.js";
import { getLandingPageHtml } from "./landing.js";

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

// Store transports by session ID for stateful connections
const transports = new Map<string, StreamableHTTPServerTransport>();

export async function startHttpServer(server: McpServer): Promise<void> {
  const app = express();
  app.use(express.json());

  // Mount OAuth discovery and token endpoints.
  // These are always available so clients that need OAuth can use them,
  // but no access control is enforced on /mcp — anyone can call it directly.
  app.use(createOAuthRouter());

  // Landing page
  app.get("/", (_req: Request, res: Response) => {
    res.type("html").send(getLandingPageHtml());
  });

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: "handley-library", version: "1.0.0" });
  });

  // MCP endpoint - handles POST requests (client-to-server messages)
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      // Check for existing session
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports.has(sessionId)) {
        // Reuse existing transport for this session
        transport = transports.get(sessionId)!;
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New session - create transport
        const newSessionId = randomUUID();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
          onsessioninitialized: (id) => {
            transports.set(id, transport);
          },
        });

        // Clean up on close
        transport.onclose = () => {
          transports.delete(newSessionId);
        };

        // Connect the MCP server to this transport
        await server.connect(transport);
      } else {
        // Invalid request - no session and not an initialize request
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Bad Request: No valid session. Send an initialize request first.",
          },
          id: null,
        });
        return;
      }

      // Handle the request
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  // Handle GET requests for SSE streams (server-to-client notifications)
  app.get("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Bad Request: Invalid or missing session ID",
        },
        id: null,
      });
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // Handle DELETE requests to close sessions
  app.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Bad Request: Invalid or missing session ID",
        },
        id: null,
      });
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.close();
    transports.delete(sessionId);
    res.status(204).send();
  });

  app.listen(PORT, HOST, () => {
    console.log(`Handley Library MCP server running on http://${HOST}:${PORT}`);
    console.log(`MCP endpoint: http://${HOST}:${PORT}/mcp`);
    console.log(`Health check: http://${HOST}:${PORT}/health`);
    console.log(`OAuth metadata: http://${HOST}:${PORT}/.well-known/oauth-authorization-server`);
  });
}
