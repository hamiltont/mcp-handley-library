# Handley Library MCP Server - Architecture

## System Context

This MCP server enables rapid library catalog searches for the Handley Regional Library (Winchester, VA). The server is called by an LLM as part of a larger workflow where book recommendations are found via web search, then this tool checks local library availability.

**Key Design Constraint:** LLM context window is precious real estate. Token optimization is paramount - the upstream library API returns verbose data that must be aggressively filtered and formatted before presenting to the LLM.

**Deployment:** HTTP transport on home server behind authentication gateway (no MCP server auth needed). Also supports stdio for local testing.

**Scale:** Single user (expandable to family with shared library account). No multi-tenancy requirements.

## Technology Stack

- **@modelcontextprotocol/sdk** (v1.25.3) - MCP protocol implementation
- **TypeScript** (v5.7) with strict mode - Type safety and clarity
- **Zod** (v3.25) - Input validation schemas for tool parameters
- **Node.js 20+** - Runtime with native fetch API support
- **Express** (v4.21) - HTTP server for web-accessible deployment
- **tsx** - Development runtime for rapid iteration
- **Docker** - Containerized deployment for home media server

## Component Breakdown

### Entry Point (`src/index.ts`)
- Determines transport mode (stdio vs HTTP) based on CLI args
- Creates server instance and connects appropriate transport
- Minimal logic - just routing

### Server Factory (`src/server.ts`)
- Creates and configures MCP server instance
- Registers all tool handlers
- Single responsibility: server setup

### HTTP Transport (`src/http.ts`)
- Express server implementing Streamable HTTP transport
- Session management with UUID-based session IDs
- Health check endpoint for monitoring
- Handles POST (messages), GET (SSE streams), DELETE (session cleanup)

### API Client (`src/lib/api.ts`)
- HTTP client for TLC LS2 PAC reverse-engineered API
- Handles required headers (`Ls2pac-config-name: ysm`, etc.)
- Three core functions: search, availability check, resource details
- Uses native fetch (Node 18+)
- No rate limiting or retry logic (fail fast design)

### Tool Handlers (`src/tools/*.ts`)
- `search.ts` - Catalog search with field and sort options
- `availability.ts` - Real-time circulation status checks
- `details.ts` - Detailed bibliographic information

Each tool is self-contained with its own Zod schema, API client calls, and response formatting.

## Data Flow

### Current Flow (Inefficient)
```
User → LLM → search_catalog → [JSON blob of 10 books with all fields]
            ↓
            check_availability → [JSON blob of availability for 10 items]
            ↓
        LLM parses and presents
```

**Problems:**
- Two separate API calls exposed to LLM
- Massive JSON blobs eat context window
- Irrelevant fields returned (extent, rtype, hostBibliographicId, etc.)
- Not optimized for context use

### Target Flow (Efficient)
```
User → LLM → find_books (consolidated tool) → [Markdown with only relevant fields]
            ↓
        LLM presents directly
```

**Benefits:**
- Single tool call
- Markdown output (fewer tokens than JSON)
- Only return: title, author, format, branch, availability, call number
- Branch filtering built-in
- Availability pre-fetched

## Token Optimization Strategy

The upstream library API returns extremely verbose JSON responses with many irrelevant fields. Since LLM context is expensive and limited, the MCP server must aggressively optimize token usage.

### Core Principles

**1. Return only essential fields**
- Title, author, format, branch, availability, call number
- Strip: internal IDs, metadata, publication details, images, reviews

**2. Prefer markdown over JSON when possible**
- Markdown tables are more compact than JSON for tabular data
- Natural language summaries instead of structured metadata
- Example: "✓ Available at Bowman" vs `{"available": true, "branchName": "Bowman"}`

**3. Filter before returning**
- Branch filtering: only show relevant locations
- Availability filtering: optionally hide unavailable items
- Reduces token count by eliminating irrelevant data

**4. Compact formatting**
- Keep call numbers readable: "Adult Non-Fiction 814.54 Qui" matches physical library signage
- Truncate verbose values where appropriate

**5. Reasonable limits**
- Cap results at configurable limit (e.g., 20 books max)
- No pagination - if you can't find it in first N results, it's not there
- Fail fast on timeouts rather than retrying

### Example Optimization

**Before (current JSON output):** ~1500 tokens for 10 results
```json
{
  "resourceId": 2650073,
  "title": "Loud and clear",
  "author": "Quindlen, Anna.",
  "format": "Book",
  "publicationDate": "2004",
  "isbn": "9781400061129",
  "holdings": [
    {
      "branch": "Bowman",
      "collection": "Adult Non-Fiction",
      "callNumber": "814.54 Qui",
      "barcode": "39925003470542"
    }
  ]
}
```

**After (markdown output):** ~500 tokens for 10 results
```markdown
| Title | Author | Branch | Available | Call # |
|-------|--------|--------|-----------|--------|
| Loud and clear | Quindlen, Anna | Bowman | ✓ Yes | Adult Non-Fiction 814.54 Qui |
```

**Savings:** ~60% reduction

## Security Model

**MCP Server Authentication:** None required. Public catalog data only.

**Deployment Protection:** Server runs behind home gateway that handles authentication. MCP server itself is unauthenticated.

**Library API Authentication:** 
- Catalog search/availability: Public, no auth required
- Holds/history (if implemented): Requires library card credentials
- Design: Single shared family account via environment variables (`LIBRARY_USER_ID`, `LIBRARY_PIN`)
- No per-user authentication needed (family use case)

**Trace Mode:** Optional `TRACE_MODE=true` environment variable for debugging. Logs to stderr (doesn't interfere with stdio transport).

## Deployment Configuration

### Environment Variables

**Public API usage:** None required

**Optional configuration:**
```bash
# Library authentication (for holds/history features if implemented)
LIBRARY_USER_ID=your_library_id
LIBRARY_PIN=your_pin

# HTTP transport config
PORT=3000              # Default: 3000
HOST=0.0.0.0          # Default: 0.0.0.0

# Debugging
TRACE_MODE=false      # Default: false

# Result limits (if configurable)
MAX_RESULTS=20        # Default: 20

# API timeout (if configurable)
API_TIMEOUT_MS=5000   # Default: 5000
```

### Transport Selection
- Default: stdio (for Claude Desktop)
- HTTP mode: `--http` flag
- No config file needed

### Docker Deployment
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["node", "dist/index.js", "--http"]
```

Exposed on port 3000, behind home media server gateway.

## API Integration Details

### TLC LS2 PAC API (Reverse-Engineered)
- Base URL: `https://catalog.handleyregional.org`
- Required headers: `Ls2pac-config-name: ysm`, `Ls2pac-config-type: pac`, `X-Requested-With: XMLHttpRequest`
- No API key required (public catalog)
- No published rate limits (be respectful)

### Endpoints Used
1. **POST /search** - Catalog search (double-encoded JSON searchTerm)
2. **POST /availability** - Circulation status for specific barcodes
3. **GET /resource/details/{id}** - Full bibliographic record

### Known Quirks
- `searchTerm` field requires JSON-stringified object inside request JSON
- Cache-busting `?_=timestamp` parameter may help (optional)
- Status codes: `"I"` = In, `"O"` = Out (likely)
- No CORS headers (server-side only, not browser-compatible)

## Code Organization

```
src/
├── index.ts              # Entry point, transport selection
├── server.ts             # MCP server factory, tool registration
├── http.ts               # HTTP transport (Express + SSE)
├── lib/
│   └── api.ts           # TLC LS2 PAC API client
└── tools/
    ├── search.ts        # search_catalog tool
    ├── availability.ts  # check_availability tool
    └── details.ts       # get_book_details tool
```

**Design Patterns:**
- Tool handlers are self-contained modules
- Each tool registers itself on the MCP server
- API client is shared library (no tool-specific logic)
- Transport selection at entry point (stdio vs HTTP)

## Performance Considerations

**Response Time:**
- Target: <2 seconds for typical search
- Timeout: 5 seconds max before abandoning API call
- No retry logic (fail fast for waiting users)

**Token Usage:**
- Target: <500 tokens for typical 10-result response
- Strategy: Markdown format, field stripping, compact formatting

**Scalability:**
- Designed for: Single user, family of 2-4 max
- No caching layer needed
- No database required
- Stateless operation (except HTTP session management)

**API Courtesy:**
- Reasonable limits (cap results at 20)
- No aggressive pagination/scraping
- Fail fast on errors (don't hammer failing endpoints)

## Error Handling

**API Failures:**
- Network errors: "Unable to reach library catalog"
- Timeouts: "Library catalog is responding slowly, please try again"
- Malformed responses: "Unexpected response from library system"
- HTTP errors: Include status code and message

**Empty Results:**
- No matches: "No books found matching '{query}'"
- No availability data: Include diagnostic info from API

**Validation Errors:**
- Zod schema validation with clear messages
- Parameter type mismatches explained in plain language
- Invalid enum values: show valid options

## Rejected Architectural Decisions

### Why Not Z39.50?
- Handley doesn't expose Z39.50 publicly
- Reverse-engineered JSON API works fine
- Not worth complexity of protocol translation

### Why Not GraphQL?
- Upstream API is REST-like
- Overhead not justified for 3 simple endpoints
- Keep it simple

### Why Not Caching?
- Data changes frequently (availability updates in real-time)
- Single user doesn't benefit from cache
- Adds complexity for minimal gain

### Why Not WebSockets?
- Request-response pattern sufficient
- No need for live updates
- SSE via Streamable HTTP already available if needed
