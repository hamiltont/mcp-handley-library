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
- `find-books.ts` - Consolidated catalog search with availability checking

The tool is self-contained with its own Zod schema, calls multiple API endpoints, and aggregates results into a unified meta object.

## Data Flow

```
User → LLM → find_books (consolidated tool)
                  ↓
              Search API + Availability API
                  ↓
              Meta Object (in-memory aggregation)
                  ↓
              Deduplication (consolidate copies)
                  ↓
              CSV Format Transformation
                  ↓
              Output to LLM
```

The `find_books` tool follows this flow:
1. Calls search API to get catalog results
2. Calls availability API to get circulation status
3. Aggregates ALL data into a unified "meta object" in memory
4. **Deduplicates results** (merge multiple copies, consolidate branches)
5. Transforms to CSV format: `Title,Author,Call#,Branch,Status,Notes`
6. Returns compact CSV output (~60-70% fewer tokens than JSON, additional 40-60% reduction from deduplication for popular books)

### Meta Object Design Pattern

**Key Architectural Decision:** Separate data aggregation from output formatting.

**Why this approach:**

1. **Single Source of Truth:** All data from multiple API calls is merged into one complete in-memory structure before any transformations. This ensures consistency and makes it easy to reason about what data is available.

2. **Format Flexibility:** The meta object contains ALL fields from both APIs. Future format transformations (CSV, markdown, compact JSON) can each select which fields they need without re-fetching data or changing the aggregation logic.

3. **Composable Transformations:** New output formats can be added as pure transformation functions that take the meta object and return formatted output. No need to modify API calling logic or data aggregation.

4. **Context-Aware Formatting:** Different use cases (at library vs. planning from home) may want different fields. The meta object has everything; transformations can omit fields based on context.

5. **Debugging and Testing:** Having the complete raw data structure makes it easy to debug issues and write tests without mocking API calls.

**Structure:**
```typescript
{
  // All resource fields from search API
  id, title, author, format, publicationDate, standardNumbers, etc.
  
  // Holdings array with merged availability data
  holdingsInformations: [
    {
      // All holding fields from search API
      branchName, collectionName, callNumber, barcode, etc.
      
      // Availability data merged in
      availability: {
        available, status, dueDate, statusCode, etc.
      }
    }
  ]
}
```

**Deduplication:**
- Automatically consolidates duplicate holdings before CSV formatting
- Same branch, multiple copies: Single row with quantity notes (e.g., "3 copies (1 available)")
- Multiple branches: Single row with branch="Multiple" and details in Notes (e.g., "2 at Bowman (1 available), 1 at Handley")
- Status prioritization: "Available" if ANY copy is available, otherwise "Checked Out"
- Preserves different editions (different call numbers remain separate)
- Token savings: 40-60% reduction for popular books (e.g., Harry Potter: 106 rows → 43 rows)
- Implementation in `src/lib/deduplicator.ts`

**CSV Transformation:**
- 60-70% token reduction vs JSON
- Format: `Title,Author,Call#,Branch,Status,Notes`
- Call numbers expanded with human-readable descriptions (see Call Number Expansion below)
- Smart Notes column (empty for standard books, populated for edge cases, quantity info, and branch details)
- Proper CSV escaping for special characters

**Call Number Expansion:**
- Collection codes expanded inline: `J DON` → `Juvenile Fiction J DON`
- Dewey Decimal numbers expanded: `814.54 Qui` → `Literature 814.54 Qui`
- Prioritizes Dewey expansion over collection codes when both present
- Improves clarity without losing shelf navigation information
- Implementation in `src/lib/call-number-expander.ts`

This pattern (meta object → deduplication → transformation) enables adding new output formats without modifying API calling or aggregation logic. See `src/lib/csv-formatter.ts` and `src/lib/deduplicator.ts` for implementation.

## Token Optimization Strategy

The upstream library API returns extremely verbose JSON responses with many irrelevant fields. Since LLM context is expensive and limited, the MCP server aggressively optimizes token usage through structured transformation patterns.

### Optimization Principles

**1. Separate aggregation from formatting**
- Meta object contains ALL data from all APIs
- Transformations select which fields to include
- No data loss during aggregation - optimization happens at formatting layer
- Enables multiple output formats without re-fetching data

**2. Format selection based on token efficiency**
- CSV format chosen for maximum compactness (63% reduction vs markdown, 67% vs JSON)
- Flexible "Notes" column handles edge cases without disrupting structure
- Format: `Title,Author,Call#,Branch,Status,Notes`

**3. Context-aware field selection**
- Different use cases need different fields (e.g., "at library" needs call numbers, "planning holds" may not)
- Transformations can omit fields based on context while preserving them in meta object
- Status always included (core availability information)

**4. Pre-filtering before formatting**
- Branch filtering: only show relevant locations
- Availability filtering: optionally hide unavailable items
- Result limits (20 per search) prevent overwhelming the LLM
- Reduces token count by eliminating irrelevant results before formatting

**5. Fail-fast design**
- No pagination - if you can't find it in first 20, refine query
- Timeouts fail immediately rather than retrying
- Simplifies code and avoids hammering the API

### Optimization Categories Applied

**Field stripping:** API returns 40+ fields per book, only 6 fields included in output (title, author, call number, branch, status, notes)

**Format choice:** CSV for structured catalog data (most compact while remaining readable)

**Call number expansion:** API provides 3 separate fields (prefix, class, cutter), MCP server concatenates these with human-readable descriptions for clarity

**Precision reduction:** Boolean availability translated to simple "Available"/"Checked Out" status strings

**Variable naming:** Short CSV headers (`Call#` not `Call Number`, `Notes` not `Additional Information`)

### Measured Results

**Token savings:** ~60-70% reduction vs raw JSON

**Example transformation:**
- Raw API response: ~1500 tokens for 10 results (all fields)
- CSV output: ~500 tokens for 10 results (essential fields only)

```csv
Title,Author,Call#,Branch,Status,Notes
The giants and the Joneses,"Donaldson, Julia.",Juvenile Fiction J Donaldson,Bowman,Available,
One Ted falls out of bed,"Donaldson, Julia.",Juvenile Easy JE Donaldson,Bowman,Available,
Loud and Clear,"Quindlen, Anna",Literature 814.54 Qui,Bowman,Available,
```

**Testing approach:** Test suite validates token optimization preserves functionality. 29 tests with real API data samples ensure edge cases are handled correctly.

Implementation in `src/lib/csv-formatter.ts`.

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
├── index.ts                      # Entry point, transport selection
├── server.ts                     # MCP server factory, tool registration
├── http.ts                       # HTTP transport (Express + SSE)
├── lib/
│   ├── api.ts                   # TLC LS2 PAC API client (searchCatalog, checkAvailability, getResourceDetails)
│   ├── call-number-expander.ts  # Call number expansion logic (collection codes, Dewey Decimal)
│   ├── deduplicator.ts          # Result deduplication logic (merge copies, consolidate branches)
│   └── csv-formatter.ts         # CSV transformation functions (formatAsCSV, buildCallNumber, buildNotes)
└── tools/
    └── find-books.ts            # find_books tool (consolidated search + availability + deduplication + CSV output)
```

**Design Patterns:**
- Meta object pattern: aggregate all API data before formatting
- Tool handler is self-contained module
- API client is shared library with pure functions for each endpoint
- Transport selection at entry point (stdio vs HTTP)
- Future: add format transformation layer between meta object and output

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
