/**
 * HTTP transport for the MCP server using Streamable HTTP
 *
 * When OAUTH_ENABLED=true (or by default), mounts rubber-stamp OAuth endpoints
 * and requires a Bearer token on the /mcp endpoint. The token is never actually
 * validated - see src/oauth.ts for the full disclaimer.
 */

import express, { Request, Response, NextFunction } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { createOAuthRouter } from "./oauth.js";

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

// OAuth is on by default for HTTP mode. Set OAUTH_ENABLED=false to disable.
const OAUTH_ENABLED = process.env.OAUTH_ENABLED !== "false";

// Store transports by session ID for stateful connections
const transports = new Map<string, StreamableHTTPServerTransport>();

/**
 * Returns the public base URL for this server.
 */
function getBaseUrl(req: Request): string {
  if (process.env.SERVER_URL) {
    return process.env.SERVER_URL.replace(/\/$/, "");
  }
  return `${req.protocol}://${req.get("host")}`;
}

/**
 * Middleware that checks for a Bearer token on the /mcp endpoint.
 *
 * ⚠️  RUBBER STAMP: This does NOT validate the token. Any non-empty Bearer
 * token is accepted. The only purpose is to trigger the OAuth discovery flow
 * on the client side by returning 401 + WWW-Authenticate when no token is
 * present. Once the client has gone through the OAuth dance and obtained
 * any token, all requests are accepted.
 */
function requireBearerToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // No token → tell the client where to find our OAuth metadata
    // This kicks off the MCP authorization flow (RFC 9728)
    const baseUrl = getBaseUrl(req);
    res.status(401)
      .set(
        "WWW-Authenticate",
        `Bearer realm="mcp", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`
      )
      .json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Unauthorized: Bearer token required. See WWW-Authenticate header for OAuth metadata.",
        },
        id: null,
      });
    return;
  }

  // RUBBER STAMP: Token present? Good enough. We don't check what it is.
  next();
}

export async function startHttpServer(server: McpServer): Promise<void> {
  const app = express();
  app.use(express.json());

  if (OAUTH_ENABLED) {
    // Mount OAuth discovery and token endpoints
    app.use(createOAuthRouter());
    console.log("OAuth endpoints enabled (rubber-stamp mode - no real authentication)");
  }

  // Health check endpoint (always public, no auth required)
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: "handley-library", version: "1.0.0", oauth: OAUTH_ENABLED });
  });

  // Apply bearer token check to /mcp if OAuth is enabled
  if (OAUTH_ENABLED) {
    app.use("/mcp", requireBearerToken);
  }

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
    if (OAUTH_ENABLED) {
      console.log(`OAuth metadata: http://${HOST}:${PORT}/.well-known/oauth-authorization-server`);
    }
  });
}
