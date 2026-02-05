# Branch Filtering Fix - February 2026

## Problem

Branch filtering was completely broken in the MCP server. Two separate bugs were causing issues:

1. **API-level bug**: The `searchCatalog()` function hardcoded `branchFilters: []`, always sending an empty array to the API regardless of user-specified branch filters. This caused ALL searches to return results from ALL branches.

2. **Branch name mismatch**: Tool schemas used `"Clarke County"` but the API returns `"Clarke"`, causing client-side filtering to fail.

**Impact**: Searches for smaller branches like Clarke would report misleading messages like "Found 410 result(s) at Clarke" (showing system-wide count) but return 0 results because Clarke items weren't in the first 20 results returned.

## Solution

### Changes Made

1. **Updated `src/lib/api.ts`**:
   - Added `branchFilters?: string[]` parameter to `searchCatalog()` function
   - Created branch name to ID mapping: `{ "Handley": "1", "Bowman": "2", "Clarke": "3" }`
   - Map user-friendly branch names to API branch identifiers before sending to API

2. **Updated `src/lib/book-finder.ts`**:
   - Modified `searchAndMerge()` to pass branch filters through to `searchCatalog()` API call
   - Branch filtering now happens server-side, not client-side

3. **Updated tool schemas**:
   - `src/tools/search-catalog.ts`: Changed `"Clarke County"` to `"Clarke"`
   - `src/tools/find-on-shelf.ts`: Changed `"Clarke County"` to `"Clarke"`

4. **Added comprehensive tests** (`test/branch-filtering.test.ts`):
   - Unit tests for client-side filtering functions
   - Integration tests verifying branch name mapping
   - Online tests against real API verifying server-side filtering works
   - Total: 10 new tests (115 tests total, all passing)

### Verification

**Online test results** (against real API with Julia Donaldson search):

- **No filters**: Returns all 3 branches
  - Bowman: 22 holdings
  - Handley: 9 holdings  
  - Clarke: 6 holdings

- **Filter to Bowman only**: Returns 14 results, all from Bowman ✓

- **Filter to Clarke only**: Returns 6 results, all from Clarke ✓  
  *(This was broken before - would return 0 results)*

- **Filter to Bowman + Handley**: Returns results from both branches, none from Clarke ✓

## Documentation Updates

- Updated `PRODUCT_VISION.md`:
  - Removed "Known Critical Bugs" section
  - Added "Server-Side Branch Filtering Fix" to "Implemented Features"
  - Updated test count from 105 to 115
  - Changed status from "Branch filtering (client-side)" to "Server-side branch filtering"

- Updated `ARCHITECTURE.md`:
  - Documented branch ID mapping in API section
  - Added note about branch filtering being server-side
  - Updated test coverage section with new tests

## Migration Notes

**Breaking Change**: Branch names changed from `"Clarke County"` to `"Clarke"` to match API.

If you have any code or configurations that reference branch names, update:
- `"Clarke County"` → `"Clarke"`

The other branch names remain unchanged:
- `"Handley"` - no change
- `"Bowman"` - no change

## Testing

Run tests:
```bash
npm test
```

Run online tests against real API:
```bash
RUN_ONLINE_TESTS=1 npm test -- test/branch-filtering.test.ts
```

Build and verify:
```bash
npm run build
npm run mcp:inspect
```

## Files Modified

- `src/lib/api.ts` - Added branch filters parameter and mapping
- `src/lib/book-finder.ts` - Pass branch filters to API
- `src/tools/search-catalog.ts` - Fixed branch name in schema
- `src/tools/find-on-shelf.ts` - Fixed branch name in schema
- `test/branch-filtering.test.ts` - New comprehensive test file (10 tests)
- `PRODUCT_VISION.md` - Documented fix, updated status
- `ARCHITECTURE.md` - Updated technical documentation

## Files Deleted

- `scripts/test-branch-filtering.ts` - Temporary exploration script (no longer needed)
