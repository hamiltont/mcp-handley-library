/**
 * Rubber-stamp OAuth 2.1 implementation for MCP server compatibility.
 *
 * ⚠️  SECURITY THEATER - NOT REAL AUTHENTICATION ⚠️
 *
 * This module implements the minimum OAuth 2.1 surface area required by the
 * MCP authorization spec so that clients like ChatGPT (which mandate OAuth
 * discovery + dynamic client registration) can connect to this server.
 *
 * NOTHING HERE PROVIDES ACTUAL SECURITY:
 * - Dynamic client registration accepts all comers, no questions asked
 * - The authorize endpoint auto-approves immediately (no login screen)
 * - Tokens are random UUIDs that are never validated
 * - Any Bearer token is accepted on the /mcp endpoint
 *
 * This server exposes a public library catalog. There is no user data,
 * no account access, and no reason to gate it. The OAuth ceremony exists
 * solely to satisfy client-side protocol requirements.
 *
 * If you ever add features that access private data (holds, checkout history),
 * replace this with a real OAuth provider like node-oidc-provider or Auth0.
 *
 * Spec references:
 * - MCP Authorization: https://modelcontextprotocol.io/specification/latest/basic/authorization
 * - RFC 9728 (Protected Resource Metadata): https://datatracker.ietf.org/doc/html/rfc9728
 * - RFC 8414 (AS Metadata): https://datatracker.ietf.org/doc/html/rfc8414
 * - RFC 7591 (Dynamic Client Registration): https://datatracker.ietf.org/doc/html/rfc7591
 */

import { Router, Request, Response } from "express";
import { randomUUID } from "node:crypto";

/**
 * Returns the public base URL for this server.
 * In production (Vercel, etc.) use the SERVER_URL env var.
 * Locally, falls back to http://localhost:PORT.
 */
function getBaseUrl(req: Request): string {
  if (process.env.SERVER_URL) {
    return process.env.SERVER_URL.replace(/\/$/, "");
  }
  return `${req.protocol}://${req.get("host")}`;
}

/**
 * Creates an Express router with all the OAuth endpoints needed for MCP
 * client compatibility.
 *
 * Mounts:
 *   GET  /.well-known/oauth-protected-resource
 *   GET  /.well-known/oauth-authorization-server
 *   POST /oauth/register
 *   GET  /oauth/authorize
 *   POST /oauth/token
 */
export function createOAuthRouter(): Router {
  const router = Router();

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Protected Resource Metadata (RFC 9728)
  //
  // RUBBER STAMP: Tells the client "yes, this resource is protected" and
  // points them to our authorization server (which is... ourselves).
  // In a real system this would point to an actual auth provider.
  // ──────────────────────────────────────────────────────────────────────────
  router.get("/.well-known/oauth-protected-resource", (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    res.json({
      resource: `${baseUrl}/mcp`,
      authorization_servers: [baseUrl],
      scopes_supported: ["mcp:tools"],
      bearer_methods_supported: ["header"],
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Authorization Server Metadata (RFC 8414)
  //
  // RUBBER STAMP: Advertises our OAuth endpoints so the client knows where
  // to register, authorize, and exchange tokens. All endpoints are on this
  // same server - we are pretending to be our own auth provider.
  // ──────────────────────────────────────────────────────────────────────────
  router.get("/.well-known/oauth-authorization-server", (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_basic", "client_secret_post"],
      scopes_supported: ["mcp:tools"],
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Dynamic Client Registration (RFC 7591)
  //
  // RUBBER STAMP: Accepts any registration request and hands back a
  // client_id (and client_secret, because ChatGPT expects one even when
  // registering with token_endpoint_auth_method: "none").
  // We don't store these anywhere meaningful - any token works later.
  // ──────────────────────────────────────────────────────────────────────────
  router.post("/oauth/register", (req: Request, res: Response) => {
    const body = req.body || {};

    const clientId = randomUUID();
    const clientSecret = randomUUID();

    res.status(201).json({
      client_id: clientId,
      client_secret: clientSecret,
      client_name: body.client_name || "MCP Client",
      redirect_uris: body.redirect_uris || [],
      grant_types: body.grant_types || ["authorization_code"],
      response_types: body.response_types || ["code"],
      token_endpoint_auth_method: body.token_endpoint_auth_method || "none",
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Authorization Endpoint (OAuth 2.1 Authorization Code + PKCE)
  //
  // RUBBER STAMP: This endpoint opens in the user's browser. A real server
  // would show a login form. We skip all that and immediately redirect back
  // with an authorization code. The "code" is a random UUID that we don't
  // even bother storing - the token endpoint accepts anything.
  //
  // ChatGPT opens this in a popup window, so it needs to actually redirect.
  // ──────────────────────────────────────────────────────────────────────────
  router.get("/oauth/authorize", (req: Request, res: Response) => {
    const redirectUri = req.query.redirect_uri as string;
    const state = req.query.state as string;

    if (!redirectUri) {
      res.status(400).json({ error: "missing redirect_uri" });
      return;
    }

    // Generate a fake authorization code and redirect immediately
    const code = randomUUID();

    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    if (state) {
      url.searchParams.set("state", state);
    }

    res.redirect(302, url.toString());
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Token Endpoint (OAuth 2.1 Token Exchange)
  //
  // RUBBER STAMP: Exchanges an authorization code for an access token.
  // We don't validate the code, the client_id, the client_secret, or the
  // PKCE code_verifier. We just hand back a token. Any token. It's fine.
  // ──────────────────────────────────────────────────────────────────────────
  router.post("/oauth/token", (req: Request, res: Response) => {
    res.json({
      access_token: randomUUID(),
      token_type: "Bearer",
      expires_in: 3600,
      scope: "mcp:tools",
    });
  });

  return router;
}
