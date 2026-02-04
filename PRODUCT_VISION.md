# Handley Library MCP Server - Product Vision

## Problem Statement

When visiting the local library with limited time and a 3-year-old, finding the right books quickly is challenging. The library's web catalog is slow, verbose, and not optimized for mobile use. Parents need to:

1. Search for books similar to ones their child enjoyed
2. Check availability in real-time while standing in the library
3. Know exactly where to find books (call numbers)
4. Place holds from home for later pickup

Currently, this requires multiple manual steps: web search for recommendations → check library website → parse results → note call numbers → place holds separately. Too much friction for a busy parent.

**This MCP server solves:** The middle steps. It integrates with an LLM workflow where book recommendations come from a separate skill, then this tool instantly checks what's available at the local library with minimal token usage.

## North Star Workflow

### Ultimate Vision: "Magical Library Experience"

**At Home (Evening):**
1. Parent talks to LLM: "My son loved 'Room on the Broom' because of the alliteration and characters. Find similar books available at our library."
2. LLM's book-finding skill searches the web and compiles a list
3. Handley Library MCP automatically checks which are available
4. LLM presents: "I found 8 books. 3 are at Bowman now, 5 are available for hold. I've placed holds on all of them."
5. **Holds are automatically placed using library credentials**
6. Parent gets notification when books are ready

**At Library (Next Day):**
1. Parent arrives at Bowman branch
2. Picks up held books
3. While browsing, asks: "Show me other Julia Donaldson books available here right now"
4. LLM responds: "I found 4 books on shelf: [CSV format with call numbers]"
5. Parent navigates directly to shelf using call numbers

**Key Elements of North Star:**
- Zero manual hold placement
- Real-time availability at specific branch
- Automatic library account management
- Seamless integration with external book discovery
- Token-efficient responses for phone use

## Current State

**Implemented:**
- ✅ Three MCP tools: `search_catalog`, `check_availability`, `get_book_details`
- ✅ Both stdio and HTTP transports
- ✅ TypeScript with Zod validation
- ✅ Docker deployment configuration
- ✅ Reverse-engineered API client for TLC LS2 PAC
- ✅ Works with Claude Desktop and mobile Claude

**Current Limitations:**
- Tools are separate (search, then check availability) - requires two calls
- Returns verbose JSON with many irrelevant fields
- High token usage (~1500 tokens for 10 results)
- No branch filtering
- No availability filtering
- No timeout handling
- No authentication support (holds/history not possible yet)

## Stop Criteria

**When is this "done enough"?**

### Must Have (MVP):
- Search catalog and check availability in ONE tool call (consolidated `find_books` tool)
- CSV output format with flexible Notes column (tested: 63% more efficient than markdown)
- Branch filtering (Bowman/Handley/Clarke County)
- Call numbers for shelf navigation
- <200 token responses for typical searches (10 books)

### Success Point (V1):
- Place holds programmatically
- View current holds
- Token usage <150 for typical search (10 books)
- Handles digital media (audiobooks, ebooks) intelligently via Notes column

### Future Enhancement Territory:
- Checkout history integration
- Auto-hold recommendations based on past reading
- Goodreads integration (external to this MCP)
- Multi-library support (unlikely, but possible)

**Done enough when:** A parent can stand in the library, find books in <30 seconds, and manage holds automatically without opening the library's website.

## Brainstormed Next Features

*These are brainstormed ideas for what we might work on next. They're not commitments or promises - they're possibilities we can evaluate as we go. The actual path forward will emerge through building and testing.*

### Consolidated `find_books` Tool

**What it does:** Merges `search_catalog` and `check_availability` into single tool call. Instead of requiring two separate tool calls (search, then check availability), combines both operations into one unified workflow.

**Why valuable:** Cuts tool calls in half, matches actual user workflow (no one searches without checking availability), reduces tool invocation overhead.

**Complexity:** Medium - requires refactoring existing tools to combine the two API calls internally.

**When we build this, check:**
- Does the combined tool handle all the use cases of the individual tools?
- Do branch filters work intuitively?
- Is error handling clear when either API call fails?
- Should we keep the individual tools for advanced use cases or deprecate them?

### CSV Output Format

**What it does:** Transforms tool output from verbose JSON to compact CSV format with flexible "Notes" column.

**Why valuable:** Reduces tokens by ~63% compared to current output. Testing showed CSV uses 60 tokens vs 163 tokens for markdown tables (5 books). Critical for mobile usage with limited context.

**Complexity:** Low-Medium - requires reformatting response but doesn't change API logic.

**Output Format Specification:**
- Format: `Title,Author,Call#,Branch,Status,Notes`
- **Why CSV?** Testing showed CSV is 63% more efficient than markdown tables (60 tokens vs 163 tokens for 5 books)
- **Why Notes column?** Provides flexibility for edge cases without adding structure overhead:
  - Media type variations: "Audiobook", "eBook", "DVD"
  - Personal status: "On hold for you", "Ready for pickup"
  - Special editions: "Large print", "Bilingual"
  - Empty for 99% of standard physical books (minimal token overhead)
- **Benefits:** Token-efficient, LLM-native format, future-proof, mobile-friendly
- **Trade-offs:** Less visually formatted than tables, but readability is fine for LLM consumption

**When we build this, check:**
- Does CSV parse correctly in Claude's context?
- Are we stripping the right fields? Test with real searches.
- Is the Notes column being used appropriately (not cluttered)?
- Should this be the default format or a tool parameter option?

### Bulk Book Search

**What it does:** New tool `bulk_find_books` that accepts multiple search queries (up to 20) and returns merged results. Results are organized by ordinal: all 1st results from each search, then all 2nd results, then all 3rd results, etc. Each search returns top 3-4 results maximum.

**Why valuable:** Real-world usage shows LLM repeatedly calling book finding tool for multiple titles. Bulk search reduces:
- Total tool calls (20 searches → 1 call)
- Token overhead from repeated tool call frames
- Latency from sequential requests

**Complexity:** Medium-High - requires:
- Accepting array of search queries
- Parallel API execution
- Merging results by ordinal position
- Deduplication (same book may match multiple queries)
- Hard limit enforcement (max 20 queries)
- Per-query result limiting (3-4 results each)

**When we build this, check:**
- Does ordinal-based merging work for typical LLM workflows?
- Should we allow configuring results-per-query (3-4 vs up to 20)?
- How to handle partial failures (some queries succeed, others timeout)?
- Is 20 query limit appropriate or should it be lower?
- Should results include which original query matched each book?
- Does merged output stay under token budget?
- Are searches truly independent or should we deduplicate input queries?

**Open questions:**
- Default results-per-query: 3-4 (token efficient) or up to 20 (comprehensive)?
- Should we support per-query parameters (different branches, availability filters)?
- How to communicate query→result mapping in output?

### Availability Filtering Parameter

**What it does:** Adds `available_only: boolean` parameter to `find_books`. When true, only returns books that are currently available (not checked out).

**Why valuable:** Real-time "I'm here now" searches need to filter out unavailable books. Planning searches want to see everything for holds.

**Complexity:** Simple - boolean filter on availability status.

**When we build this, check:**
- Does LLM understand when to use this based on context ("available now" vs general search)?
- Should default be true or false?
- What happens if no books match after filtering?

### Media Type Awareness

**What it does:** 
- Display media format clearly (Book, Audiobook, eBook, DVD)
- Optional `media_type` filter parameter
- Suggest alternatives: "Not available as book, but available as audiobook"

**Why valuable:** Library has digital content. Parents might want audiobooks for car trips, ebooks for travel, physical books for bedtime.

**Complexity:** Medium - requires understanding API's format field, adding filter logic, enhancing output.

**When we build this, check:**
- What are all the possible format values? (Needs API exploration)
- Should we default to physical books only?
- How to present alternatives without cluttering output?

### Place Hold API

**What it does:** 
- New tool: `place_hold(resourceId: number, pickupBranch: string)`
- Uses environment variable credentials (single family account)
- Returns confirmation or error

**Why valuable:** Enables automatic hold placement. Core of the North Star workflow.

**Complexity:** Complex - requires:
- API endpoint discovery (reverse engineering)
- Authentication flow (library card + PIN)
- Error handling (holds limits, invalid items)
- Testing without spamming real holds

**When we build this, check:**
- Does hold actually appear in library account?
- What happens if hold limit reached?
- Can we cancel holds programmatically?
- Should we add confirmation prompt for LLM?

### View Current Holds

**What it does:**
- New tool: `list_holds()`
- Returns current holds: title, status (pending/ready), pickup branch, expiration

**Why valuable:** Let LLM know what's already on hold before placing new ones. Avoid duplicates.

**Complexity:** Medium - requires:
- API endpoint discovery
- Authentication (same as place hold feature)
- Parsing holds data

**When we build this, check:**
- Does this respect the token budget?
- Should we auto-call this before placing holds?
- What statuses exist? (waiting, in-transit, ready, expired)

### Checkout History

**What it does:**
- New tool: `get_checkout_history(limit: number)`
- Returns recently checked out books
- Could feed into recommendation workflow

**Why valuable:** Enables "find books similar to ones we've read" without manual input. Integrates with Goodreads vision.

**Complexity:** Complex - requires:
- API endpoint discovery (may not exist publicly)
- Privacy considerations (history is sensitive)
- Large data handling (token budget)

**When we build this, check:**
- Is this API endpoint available?
- How far back does history go?
- Should this be filtered by format/audience?
- Token impact - might need aggressive pagination

### Result Limit Configuration

**What it does:**
- Add environment variable: `MAX_RESULTS=20`
- Make result limit configurable per deployment
- Currently hardcoded

**Why valuable:** Flexibility for different use cases. Testing with smaller limits. Future users might want different limits.

**Complexity:** Simple - environment variable + validation.

**When we build this, check:**
- What's a reasonable range? (5-50?)
- Should this be per-tool parameter instead?
- Does it affect API call batching?

### API Timeout Configuration

**What it does:**
- Add timeout handling to all API calls (currently none)
- Default: 5 seconds
- Configurable via environment: `API_TIMEOUT_MS=5000`
- Fail fast with clear error message

**Why valuable:** Library API is sometimes slow. Users are waiting with phone in hand. Better to fail quickly than hang.

**Complexity:** Simple - add timeout to fetch calls.

**When we build this, check:**
- What's the right default? (5s? 10s?)
- Should we distinguish between search and availability timeouts?
- Error message clarity for users

### Context-Aware Field Filtering

**What it does:**
- Distinguish between "real-time" searches (at library now) vs "planning" searches (browsing from home)
- For non-real-time searches: omit branch and call number from results (saves ~30-40% tokens)
- Always include status (available vs checked out) regardless of search type
- For real-time searches: include full details (branch, call number) for immediate shelf navigation

**Why valuable:** 
- Standing in library: need call numbers to find books on shelves, need branch to know which building
- Browsing from home: don't care about call numbers or which branch, just whether it's available or needs a hold
- Status is always relevant: tells you if you can get it now or need to wait
- Significant token savings for common "find me books to hold" use case

**Complexity:** Medium - requires:
- Detecting search context (real-time vs planning) via tool parameter or LLM hint
- Conditional field inclusion in output formatting
- Clear documentation for LLM to understand when to use each mode

**When we build this, check:**
- How does LLM determine which mode to use? Explicit parameter or infer from context?
- Should "planning" mode be the default (more common use case)?
- Does omitting these fields actually save meaningful tokens in practice?
- What about hybrid cases ("show me books at Bowman" from home before visiting)?

### Branch Discovery Tool (Internal)

**What it does:**
- CLI tool (not MCP tool): `npm run branches`
- Lists all branches with IDs from API
- For documentation and validation

**Why valuable:** Useful for developers. Not needed by LLM. Helps when library adds/changes branches.

**Complexity:** Simple - add GET /branches endpoint exploration, CLI script.

**When we build this, check:**
- Does the API even have a branches endpoint?
- Or do we scrape from search results?
- Document in README

### Enhanced Error Messages

**What it does:**
- Improve error messages for common scenarios:
  - "No books found" → "No books found matching 'room on broom'. Try a different search term or check spelling."
  - API timeout → "Library catalog is slow right now. Try again in a moment."
  - Invalid branch → "Branch 'bowmann' not found. Available branches: Bowman, Handley, Clarke County."

**Why valuable:** Better error messages help LLM provide better guidance to user.

**Complexity:** Simple - enhanced string formatting.

**When we build this, check:**
- Are suggestions helpful or annoying?
- Does LLM pass through errors correctly?
- Should we provide retry hints?

## Technical Decisions

### Output Format: CSV with Notes Column

**Decision Date:** February 2026

**The Problem:** How to return book search results in a way that minimizes token usage while remaining flexible for edge cases and future expansion?

**Testing Approach:** Built a token comparison test (`test-format-tokens.ts`) comparing 7 different formats with 5 sample books:

| Format | Est. Tokens | vs Baseline | Notes |
|--------|-------------|-------------|-------|
| CSV | 55 | Baseline | Most efficient |
| TSV (tab-separated) | 86 | +56% | Good but less familiar to LLMs |
| Compact Sections | 99 | +80% | Flexible but verbose |
| Section Headers (with example) | 114 | +107% | User's initial idea |
| Markdown Table | 163 | +196% | **Worst efficiency** |

**The Decision:** CSV format with standard columns plus flexible "Notes" column

**Format Specification:**
```csv
Title,Author,Call#,Branch,Status,Notes
Room on the Broom,Julia Donaldson,J DON,Bowman,Available,
The Gruffalo,Julia Donaldson,J DON,Bowman,Checked Out,
Goodnight Moon,Margaret Wise Brown,J BRO,Handley,Available,Large print
Where the Wild Things Are,Maurice Sendak,AB SEN,Digital,Available,Audiobook
```

**Why This Works:**

1. **Token Efficiency:** 63% fewer tokens than markdown tables (60 vs 163 for 5 books)
2. **LLM Native:** Claude understands CSV perfectly without special instructions
3. **Flexible:** Notes column handles edge cases without restructuring
4. **Scalable:** Empty notes column adds minimal overhead (~1 char per row)
5. **Mobile-Friendly:** Clean, readable format on small screens
6. **Future-Proof:** Can add new information types without changing schema

**Notes Column Usage Strategy:**

- **Default (99% of cases):** Empty - just a trailing comma
- **Media variations:** "Audiobook", "eBook", "DVD" when not physical book
- **Personal status:** "On hold for you", "Ready for pickup"
- **Special editions:** "Large print", "Bilingual", "Board book"
- **Availability hints:** "New arrival", "Last copy"
- **Multiple notes:** Pipe-separated if needed: "Audiobook | Large print"

**Alternative Formats Considered:**

- **Markdown Tables:** Rejected - worst token efficiency, visual bloat (pipes, dashes)
- **Section Headers:** Rejected - more readable but 80% more tokens than CSV
- **TSV:** Rejected - tabs less familiar to LLMs than commas
- **Pure CSV (no notes):** Rejected - inflexible for future expansion

**Testing Evidence:** See `test-format-tokens.ts` and `test-csv-with-notes.ts` for reproducible benchmarks.

**When to Revisit:** If we find the Notes column becoming cluttered (>30% of rows), consider adding structured columns. Until then, keep it simple.

## Development Approach

Features are developed one at a time in isolated sprints. After each feature is implemented:

1. **Stop and test** - Real-world validation with actual library queries
2. **Measure impact** - Token usage, response time, user experience
3. **Review and decide** - Does this work? What did we learn? What's next?
4. **Update vision** - Adjust brainstormed features based on learnings

**No fixed milestones or roadmap.** Each feature informs the next. The path forward emerges through building and testing.

## Rejected Ideas

### Multi-Library Support (Generalize to Other TLC Libraries)
**Why rejected:** Only Handley library is relevant for this user. Generalizing adds complexity with no benefit. Each library might have different config names, branches, and quirks. Not worth engineering effort.

**When to reconsider:** If widely sharing with others who use different libraries.

### Age/Reading Level Filtering
**Why rejected:** Parent has better understanding of child's reading level than automated filters. External book-finding skill handles age-appropriateness. Restricting results based on AR/Lexile would artificially limit discovery.

**When to reconsider:** If library's reading level data is exceptional and adds value.

### Caching/Database Layer
**Why rejected:** 
- Single user doesn't benefit from cache
- Real-time availability changes frequently
- Adds complexity, maintenance burden
- Upstream API is fast enough

**When to reconsider:** If scaling to many users or API rate limits become an issue.

### Browser-Based UI
**Why rejected:** The value is LLM integration. A web UI defeats the purpose. Use library's own website if you want that.

**When to reconsider:** Never. Stay focused on MCP workflow.

### Recommendation Engine
**Why rejected:** External skill already handles book discovery via web search. This MCP's job is checking availability, not recommendations. Keep separation of concerns.

**When to reconsider:** If checkout history integration enables "similar to books you've read" without external dependency.

### Push Notifications (Hold Ready Alerts)
**Why rejected:** Library already sends email/SMS notifications. Duplicating this adds complexity and requires persistent background service. Not in scope for MCP server.

**When to reconsider:** If building companion app with notification service.

### Goodreads Integration
**Why rejected:** Out of scope for this MCP. Goodreads integration belongs in the external book-finding skill or main LLM workflow, not library availability checking.

**When to reconsider:** Never for this MCP. Different tool, different purpose.

## Evaluation Plan

**When we reach MVP (consolidated search with token optimization)**, we'll set up an evaluation harness with test questions to validate the MCP server works correctly.

### Example Evaluation Questions:

1. "Find books by Julia Donaldson available at Bowman"
2. "Search for books about sleep training"
3. "Is 'Room on the Broom' available?"
4. "Find picture books with alliteration available now"
5. "What Julia Donaldson books are in the system?" (no branch filter)
6. "Show me board books at Clarke County"
7. "Find books by Anna Quindlen" (adult content, different audience)
8. "Is 'The Gruffalo' available as an audiobook?"
9. "Find books about dinosaurs for toddlers at Handley"
10. "Search for parenting books about gentle discipline"

**Success criteria:**
- <200 tokens per response (avg for 10 books, based on CSV format testing)
- <2 seconds response time
- Correct availability status
- Accurate call numbers
- Appropriate branch filtering
- Clear handling of no-results cases
- Proper use of Notes column (not cluttered)

**Evaluation approach:** Use the Anthropic mcp-builder skill's evaluation harness pattern:
- Define expected outputs for each test question
- Run queries programmatically
- Compare actual vs expected
- Measure token usage and latency
- Document failures for iteration

## Timeline Philosophy

This product vision focuses on **what** to build, not **when**. Features are prioritized by value and complexity, but actual implementation timing depends on:
- Real-world usage learnings
- Token optimization impact measurements
- API endpoint discovery success
- User feedback after each milestone

The North Star (automatic hold placement) guides direction, but we build incrementally and validate at each step.
