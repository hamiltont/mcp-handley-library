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

### `csv-formatter.test.ts`
Unit tests for CSV transformation functions:
- `buildCallNumber()` - Constructs call numbers from component pieces
- `buildNotes()` - Generates notes field for special formats/statuses
- `getStatus()` - Maps availability data to readable status
- `escapeCsvField()` - Proper CSV escaping for special characters
- `formatAsCSV()` - Full CSV transformation

### `csv-formatter-integration.test.ts`
Integration tests using real API sample data:
- Verifies CSV transformation works with actual library API responses
- Tests multiple search types (author, title, subject)
- Validates output structure and content

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

Current coverage:
- ✅ CSV field escaping (commas, quotes, newlines)
- ✅ Call number construction (all combinations of prefix/class/cutter)
- ✅ Status mapping (available, checked out, unknown)
- ✅ Notes generation (media types, due dates)
- ✅ Full CSV transformation
- ✅ Integration with real API responses

Not yet covered:
- Error handling paths
- Tool parameter validation (handled by Zod)
- API client functions (tested manually via sample data fetching)
