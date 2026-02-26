# Handley Library MCP Server

MCP server for searching the [Handley Regional Library](https://handleyregional.org/) catalog. Provides two tools optimized for different workflows:

- **`search_catalog`** — Plan holds by checking availability across branches
- **`find_on_shelf`** — Locate available items with call numbers at a specific branch

Both tools return CSV-formatted results optimized for minimal token usage.

## Quick Start

```bash
npm install
npm run build

# stdio mode (Claude Desktop, local clients)
npm start

# HTTP mode (remote clients, ChatGPT)
npm run dev:http
```

### With Claude Desktop

Add to your MCP settings:

```json
{
  "mcpServers": {
    "handley-library": {
      "command": "node",
      "args": ["/path/to/mcp-handley-library/dist/index.js"]
    }
  }
}
```

## Transports

### stdio (default)

For local MCP clients like Claude Desktop. No authentication needed — the transport is a local subprocess pipe.

### HTTP (`--http`)

For remote MCP clients. Exposes an Express server at `http://localhost:3000/mcp`.

**Environment variables:**
| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `SERVER_URL` | (auto-detected) | Public base URL (required for production/Vercel) |
| `OAUTH_ENABLED` | `true` | Enable OAuth discovery endpoints (set `false` to disable) |
| `MAX_TOTAL_RESULTS` | `40` | Maximum results across all queries |

### Docker

```bash
docker build -t handley-library-mcp .
docker run -p 3000:3000 handley-library-mcp
```

## OAuth / Authentication

> **This server is intentionally public. The OAuth implementation is security theater.**

The Handley Library catalog is publicly accessible — there is no user data, no account access, and nothing to protect. However, some MCP clients (notably ChatGPT) require the server to implement OAuth 2.1 discovery and dynamic client registration as part of their connection handshake.

To satisfy this requirement, the server includes a **rubber-stamp OAuth implementation** that:

- Publishes `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server` metadata
- Accepts any dynamic client registration request at `/oauth/register`
- Auto-approves authorization immediately at `/oauth/authorize` (no login screen)
- Issues random UUID tokens at `/oauth/token` without validation
- Accepts any Bearer token on the `/mcp` endpoint without checking it

**None of this provides real security.** It exists solely to conform to the discovery and handshake protocol that clients like ChatGPT require. If you need actual authentication (e.g., for hold placement with library credentials), replace this with a real OAuth provider like [node-oidc-provider](https://github.com/panva/node-oidc-provider) or a managed service like Auth0.

To disable OAuth (e.g., for local development):
```bash
OAUTH_ENABLED=false npm run dev:http
```

### OAuth Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /.well-known/oauth-protected-resource` | Resource metadata (RFC 9728) |
| `GET /.well-known/oauth-authorization-server` | Authorization server metadata (RFC 8414) |
| `POST /oauth/register` | Dynamic client registration (RFC 7591) |
| `GET /oauth/authorize` | Authorization (auto-redirects with code) |
| `POST /oauth/token` | Token exchange (returns random UUID) |

## API

This server wraps the Handley Regional Library's TLC LS2 PAC catalog API.

## Development

```bash
npm run dev          # stdio mode with tsx
npm run dev:http     # HTTP mode with tsx
npm test             # run test suite
npm run build        # compile TypeScript
```

## License

MIT
