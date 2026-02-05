# Test Infrastructure

## Overview

This directory contains tests for the MCP server, organized by type:

- **Unit tests** - Test individual functions in isolation
- **Integration tests** - Test with real API sample data
- **Sample data** - Real API responses for testing

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Test Files

### Unit Tests

**`book-finder.test.ts`**
Tests for shared search orchestration logic:
- `applyBranchFilter()` - Filters resources to specified branches
- `applyAvailabilityFilter()` - Filters to available items only
- Combined filter behavior

**`deduplicator.test.ts`**
Tests for deduplication logic with mode-specific behavior:
- Same branch, multiple copies merging
- Multiple branch consolidation
- Mode-specific behavior (`mergeCallNumbers` parameter)
  - Planning mode: Merges across different call numbers
  - Real-time mode: Preserves different call numbers for shelf navigation

**`csv-formatter.test.ts`**
Tests for CSV transformation functions:
- `buildCallNumber()` - Constructs call numbers from component pieces
- `buildNotes()` - Generates notes field for special formats/statuses
- `getStatus()` - Maps availability data to readable status
- `escapeCsvField()` - Proper CSV escaping for special characters
- `formatAsCSV()` - Full CSV transformation with mode options
  - Planning mode: Omits Call# column
  - Real-time mode: Includes Call# column

**`call-number-expander.test.ts`**
Tests for call number expansion logic:
- Collection code expansion (J → Juvenile Fiction, etc.)
- Dewey Decimal expansion (814.54 → Literature, etc.)
- Full call number construction with human-readable descriptions

### Integration Tests

**`csv-formatter-integration.test.ts`**
Integration tests using real API sample data:
- Verifies CSV transformation works with actual library API responses
- Tests multiple search types (author, title, subject)
- Validates output structure and content

**`deduplicator-integration.test.ts`**
Integration tests for deduplication with real sample data:
- Harry Potter data (106 rows → 37 rows, 65% reduction)
- Dog Man data (166 rows → 26 rows)
- Pete the Cat data (139 rows → 33 rows)

**`search-catalog-integration.test.ts`**
Integration tests verifying tool behavior:
- Planning mode uses correct parameters (mergeCallNumbers: true, includeCallNumbers: false)
- Real-time mode uses correct parameters (mergeCallNumbers: false, includeCallNumbers: true)
- Both tools share core search logic correctly

## Sample Data

The `samples/` directory contains real API responses captured using `npm run fetch-samples`:

- `search-julia-donaldson.json` - Author search results
- `search-room-on-broom.json` - Title search results
- `search-parenting.json` - Subject search (mixed formats)
- `availability-julia-donaldson.json` - Availability check results

### Refreshing Sample Data

To fetch fresh sample data from the library API:

```bash
npm run fetch-samples
```

This script is defined in `scripts/fetch-sample-data.ts` and queries the live API.

## Writing New Tests

### Unit Tests

Use real API structure from `src/lib/api.ts` types:

```typescript
import { test } from "node:test";
import assert from "node:assert";
import { yourFunction } from "../src/lib/your-module.js";

test("yourFunction: does what it should", () => {
  const input = { /* ... */ };
  const result = yourFunction(input);
  assert.strictEqual(result, expectedValue);
});
```

### Integration Tests

Load sample data and verify transformations:

```typescript
import { readFileSync } from "fs";
import type { SearchResponse } from "../src/lib/api.js";

test("transformation: works with real data", () => {
  const data: SearchResponse = JSON.parse(
    readFileSync("test/samples/your-sample.json", "utf-8")
  );
  
  // Test transformation
  const result = transform(data);
  
  // Verify result structure/content
  assert.ok(result.length > 0);
});
```

## Test Philosophy

1. **Test transformations, not API calls** - API calls are tested through sample data
2. **Use real data structures** - Load actual API responses for integration tests
3. **Test edge cases** - Empty fields, special characters, null values
4. **Keep tests fast** - No live API calls in tests (use samples)
5. **Verify behavior, not implementation** - Test what the function does, not how

## Test Coverage

**Total: 105 tests, all passing**

Current coverage:
- ✅ Shared search orchestration (branch/availability filtering)
- ✅ Mode-specific deduplication (merge vs preserve call numbers)
- ✅ Mode-specific CSV formatting (with/without Call# column)
- ✅ CSV field escaping (commas, quotes, newlines)
- ✅ Call number construction and expansion (all combinations)
- ✅ Status mapping (available, checked out, unknown)
- ✅ Notes generation (media types, due dates, quantities, branches)
- ✅ Full transformation pipeline with real API data
- ✅ Tool integration (planning vs real-time mode behavior)

Not yet covered:
- Full tool handler end-to-end with mocked API
- Error handling paths (API failures, timeouts)
- Tool parameter validation (handled by Zod)
- API client functions (tested manually via sample data fetching)
