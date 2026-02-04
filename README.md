# Handley Library MCP Server

An MCP (Model Context Protocol) server for searching the Handley Regional Library catalog.

## Tools

- **search_catalog** - Search for books by title, author, subject, ISBN, etc.
- **check_availability** - Check real-time circulation status for items
- **get_book_details** - Get full bibliographic info for a resource

## Usage

### Local Development (stdio transport)

```bash
npm install
npm run dev
```

### With Cursor/Claude Desktop

Add to your MCP settings:

```json
{
  "mcpServers": {
    "handley-library": {
      "command": "node",
      "args": ["/Users/hamiltont/mcp-handley-library/dist/index.js"]
    }
  }
}
```

### HTTP Transport

```bash
npm run dev:http
```

Server starts on `http://localhost:3000/mcp`

### Docker Deployment

```bash
docker build -t handley-library-mcp .
docker run -p 3000:3000 handley-library-mcp
```

## API

This server wraps the Handley Regional Library's TLC LS2 PAC catalog API. See `api.md` for detailed API documentation.
