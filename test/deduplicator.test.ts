/**
 * Tests for deduplication logic
 */

import assert from "node:assert";
import { test } from "node:test";
import type { Resource } from "../src/lib/api.js";
import type { MergedHolding, MergedResource } from "../src/lib/csv-formatter.js";
import { deduplicateResults, type DeduplicationOptions } from "../src/lib/deduplicator.js";

// Helper to create a test resource
function createResource(
  title: string,
  author: string,
  holdings: Array<{
    callPrefix?: string | null;
    callClass?: string | null;
    callCutter?: string | null;
    branchName: string;
    available: boolean;
  }>
): MergedResource {
  return {
    id: 1,
    shortTitle: title,
    shortAuthor: author,
    format: "Book",
    holdingsInformations: holdings.map((h, idx) => ({
      barcode: `BARCODE${idx}`,
      branchName: h.branchName,
      collectionName: "Fiction",
      callPrefix: h.callPrefix || null,
      callClass: h.callClass || "TEST",
      callCutter: h.callCutter || "TST",
      availability: {
        itemIdentifier: `BARCODE${idx}`,
        available: h.available,
        status: h.available ? "Available" : "Checked Out",
        statusCode: h.available ? "I" : "O",
      },
    } as MergedHolding)),
  } as MergedResource;
}

// --- Test: No duplicates (should pass through unchanged) ---

test("deduplicateResults: no duplicates - single book, single branch, single copy", () => {
  const input = [
    createResource("Test Book", "Test Author", [
      { branchName: "Bowman", available: true },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].holdingsInformations.length, 1);
  assert.strictEqual(result[0].holdingsInformations[0].branchName, "Bowman");
  
  // Should NOT have quantity notes (only 1 copy)
  const holding = result[0].holdingsInformations[0] as any;
  assert.strictEqual(holding._quantityNotes, undefined);
});

// --- Test: Same branch, multiple copies ---

test("deduplicateResults: same branch - 3 copies, 1 available", () => {
  const input = [
    createResource("Harry Potter", "Rowling", [
      { branchName: "Bowman", available: true },
      { branchName: "Bowman", available: false },
      { branchName: "Bowman", available: false },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 1, "Should return 1 resource");
  assert.strictEqual(result[0].holdingsInformations.length, 1, "Should have 1 holding");
  
  const holding = result[0].holdingsInformations[0] as any;
  assert.strictEqual(holding.branchName, "Bowman");
  assert.strictEqual(holding.availability.available, true, "Should prefer available copy");
  assert.strictEqual(holding._quantityNotes, "3 copies (1 available)");
});

test("deduplicateResults: same branch - 2 copies, all checked out", () => {
  const input = [
    createResource("Dog Man", "Pilkey", [
      { branchName: "Handley", available: false },
      { branchName: "Handley", available: false },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].holdingsInformations.length, 1);
  
  const holding = result[0].holdingsInformations[0] as any;
  assert.strictEqual(holding.branchName, "Handley");
  assert.strictEqual(holding.availability.available, false);
  assert.strictEqual(holding._quantityNotes, "2 copies (all checked out)");
});

test("deduplicateResults: same branch - 5 copies, 3 available", () => {
  const input = [
    createResource("Pete the Cat", "Dean", [
      { branchName: "Bowman", available: true },
      { branchName: "Bowman", available: true },
      { branchName: "Bowman", available: true },
      { branchName: "Bowman", available: false },
      { branchName: "Bowman", available: false },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 1);
  const holding = result[0].holdingsInformations[0] as any;
  assert.strictEqual(holding._quantityNotes, "5 copies (3 available)");
  assert.strictEqual(holding.availability.available, true);
});

// --- Test: Multiple branches ---

test("deduplicateResults: multiple branches - 2 branches, both available", () => {
  const input = [
    createResource("The Gruffalo", "Donaldson", [
      { branchName: "Bowman", available: true },
      { branchName: "Handley", available: true },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 1, "Should return 1 resource");
  assert.strictEqual(result[0].holdingsInformations.length, 1, "Should have 1 holding");
  
  const holding = result[0].holdingsInformations[0] as any;
  assert.strictEqual(holding.branchName, "Multiple");
  assert.strictEqual(holding.availability.available, true, "Should be available if any branch has it");
  
  // Branch details should list both branches
  assert.match(holding._branchDetails, /1 at Bowman \(1 available\)/);
  assert.match(holding._branchDetails, /1 at Handley \(1 available\)/);
});

test("deduplicateResults: multiple branches - 3 branches, mixed availability", () => {
  const input = [
    createResource("Harry Potter", "Rowling", [
      { branchName: "Bowman", available: true },
      { branchName: "Bowman", available: false },
      { branchName: "Handley", available: false },
      { branchName: "Clarke County", available: true },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 1);
  const holding = result[0].holdingsInformations[0] as any;
  
  assert.strictEqual(holding.branchName, "Multiple");
  assert.strictEqual(holding.availability.available, true, "Should be available if any branch has available copy");
  
  // Should mention all 3 branches with counts
  assert.match(holding._branchDetails, /2 at Bowman \(1 available\)/);
  assert.match(holding._branchDetails, /1 at Handley/);
  assert.match(holding._branchDetails, /1 at Clarke County \(1 available\)/);
});

test("deduplicateResults: multiple branches - all checked out", () => {
  const input = [
    createResource("Popular Book", "Author", [
      { branchName: "Bowman", available: false },
      { branchName: "Handley", available: false },
      { branchName: "Clarke County", available: false },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 1);
  const holding = result[0].holdingsInformations[0] as any;
  
  assert.strictEqual(holding.branchName, "Multiple");
  assert.strictEqual(holding.availability.available, false, "Should be unavailable if all copies checked out");
  
  // Should list branches without "(X available)" since none are available
  assert.match(holding._branchDetails, /1 at Bowman/);
  assert.match(holding._branchDetails, /1 at Handley/);
  assert.match(holding._branchDetails, /1 at Clarke County/);
});

// --- Test: Mixed scenarios ---

test("deduplicateResults: multiple books with different duplication patterns", () => {
  const input = [
    // Book 1: Single copy at single branch (no dedup needed)
    createResource("Book One", "Author One", [
      { branchName: "Bowman", available: true },
    ]),
    
    // Book 2: Multiple copies at same branch
    createResource("Book Two", "Author Two", [
      { branchName: "Handley", available: true },
      { branchName: "Handley", available: false },
    ]),
    
    // Book 3: Multiple branches
    createResource("Book Three", "Author Three", [
      { branchName: "Bowman", available: true },
      { branchName: "Clarke County", available: false },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 3, "Should return 3 books");
  
  // Book 1: unchanged
  assert.strictEqual(result[0].holdingsInformations.length, 1);
  assert.strictEqual(result[0].holdingsInformations[0].branchName, "Bowman");
  assert.strictEqual((result[0].holdingsInformations[0] as any)._quantityNotes, undefined);
  
  // Book 2: same branch dedup
  assert.strictEqual(result[1].holdingsInformations.length, 1);
  assert.strictEqual(result[1].holdingsInformations[0].branchName, "Handley");
  assert.strictEqual((result[1].holdingsInformations[0] as any)._quantityNotes, "2 copies (1 available)");
  
  // Book 3: multi-branch dedup
  assert.strictEqual(result[2].holdingsInformations.length, 1);
  assert.strictEqual(result[2].holdingsInformations[0].branchName, "Multiple");
  assert.match((result[2].holdingsInformations[0] as any)._branchDetails, /Bowman/);
  assert.match((result[2].holdingsInformations[0] as any)._branchDetails, /Clarke County/);
});

// --- Test: Different books with same title/author (different call numbers) ---

test("deduplicateResults: different editions - planning mode merges, real-time mode separates", () => {
  const input = [
    {
      ...createResource("Harry Potter", "Rowling", [
        { callClass: "J", callCutter: "ROW", branchName: "Bowman", available: true },
      ]),
    },
    {
      ...createResource("Harry Potter", "Rowling", [
        { callClass: "AB", callCutter: "ROW", branchName: "Bowman", available: true },
      ]),
    },
  ];

  // Planning mode (default): merges different call numbers
  const planningResult = deduplicateResults(input);
  assert.strictEqual(planningResult.length, 1, "Planning mode should merge different editions");
  
  // Real-time mode: preserves different call numbers (different shelf locations)
  const realtimeResult = deduplicateResults(input, { mergeCallNumbers: false });
  assert.strictEqual(realtimeResult.length, 2, "Real-time mode should preserve different editions");
});

// --- Test: Edge cases ---

test("deduplicateResults: empty input returns empty array", () => {
  const result = deduplicateResults([]);
  assert.strictEqual(result.length, 0);
});

test("deduplicateResults: resource with no holdings", () => {
  const input = [
    {
      id: 1,
      shortTitle: "Test",
      shortAuthor: "Author",
      holdingsInformations: [],
    } as MergedResource,
  ];

  const result = deduplicateResults(input);
  assert.strictEqual(result.length, 0, "Resources with no holdings should be filtered out");
});

// --- Test: mergeCallNumbers parameter (planning vs real-time mode) ---

test("deduplicateResults: mergeCallNumbers=true (planning mode) - merges different call numbers", () => {
  // Same book in different sections (juvenile vs juvenile easy)
  const input = [
    createResource("Room on the Broom", "Donaldson", [
      { callPrefix: "J", callClass: "DON", callCutter: "RO", branchName: "Bowman", available: true },
      { callPrefix: "JE", callClass: "DON", callCutter: "RO", branchName: "Bowman", available: true },
    ]),
  ];

  const result = deduplicateResults(input, { mergeCallNumbers: true });

  assert.strictEqual(result.length, 1, "Should merge into 1 resource");
  assert.strictEqual(result[0].holdingsInformations.length, 1, "Should have 1 consolidated holding");
  
  const holding = result[0].holdingsInformations[0] as any;
  assert.strictEqual(holding._quantityNotes, "2 copies (2 available)");
});

test("deduplicateResults: mergeCallNumbers=false (real-time mode) - preserves different call numbers", () => {
  // Same book in different sections - keep separate for shelf navigation
  const input = [
    createResource("Room on the Broom", "Donaldson", [
      { callPrefix: "J", callClass: "DON", callCutter: "RO", branchName: "Bowman", available: true },
      { callPrefix: "JE", callClass: "DON", callCutter: "RO", branchName: "Bowman", available: true },
    ]),
  ];

  const result = deduplicateResults(input, { mergeCallNumbers: false });

  assert.strictEqual(result.length, 2, "Should keep as 2 separate resources (different shelf locations)");
  assert.strictEqual(result[0].holdingsInformations.length, 1);
  assert.strictEqual(result[1].holdingsInformations.length, 1);
});

test("deduplicateResults: mergeCallNumbers=false - still merges same call number at same branch", () => {
  // Multiple copies with SAME call number at SAME branch - should still merge
  const input = [
    createResource("Harry Potter", "Rowling", [
      { callPrefix: "J", callClass: "ROW", callCutter: "HAR", branchName: "Bowman", available: true },
      { callPrefix: "J", callClass: "ROW", callCutter: "HAR", branchName: "Bowman", available: false },
      { callPrefix: "J", callClass: "ROW", callCutter: "HAR", branchName: "Bowman", available: false },
    ]),
  ];

  const result = deduplicateResults(input, { mergeCallNumbers: false });

  assert.strictEqual(result.length, 1, "Should merge same call numbers");
  assert.strictEqual(result[0].holdingsInformations.length, 1);
  
  const holding = result[0].holdingsInformations[0] as any;
  assert.strictEqual(holding._quantityNotes, "3 copies (1 available)");
});

test("deduplicateResults: mergeCallNumbers=false - different call numbers at different branches stay separate", () => {
  // Same book, different sections, different branches
  const input = [
    createResource("The Gruffalo", "Donaldson", [
      { callPrefix: "J", callClass: "DON", callCutter: "GR", branchName: "Bowman", available: true },
      { callPrefix: "JE", callClass: "DON", callCutter: "GR", branchName: "Handley", available: true },
    ]),
  ];

  const result = deduplicateResults(input, { mergeCallNumbers: false });

  assert.strictEqual(result.length, 2, "Should keep separate (different call numbers AND different branches)");
  assert.strictEqual(result[0].holdingsInformations[0].branchName, "Bowman");
  assert.strictEqual(result[1].holdingsInformations[0].branchName, "Handley");
});

test("deduplicateResults: mergeCallNumbers=true - creates Multiple branch for different call numbers across branches", () => {
  // Planning mode: merge across branches even with different call numbers
  const input = [
    createResource("The Gruffalo", "Donaldson", [
      { callPrefix: "J", callClass: "DON", callCutter: "GR", branchName: "Bowman", available: true },
      { callPrefix: "JE", callClass: "DON", callCutter: "GR", branchName: "Handley", available: true },
    ]),
  ];

  const result = deduplicateResults(input, { mergeCallNumbers: true });

  assert.strictEqual(result.length, 1, "Should merge into single resource");
  assert.strictEqual(result[0].holdingsInformations.length, 1);
  assert.strictEqual(result[0].holdingsInformations[0].branchName, "Multiple");
  
  const holding = result[0].holdingsInformations[0] as any;
  assert.ok(holding._branchDetails.includes("Bowman"));
  assert.ok(holding._branchDetails.includes("Handley"));
});

// --- Test: Case-insensitive deduplication ---

test("deduplicateResults: case-insensitive title - same book with different capitalization", () => {
  const input = [
    createResource("Harry Potter and the Chamber of Secrets", "Rowling, J.K.", [
      { branchName: "Bowman", available: true },
    ]),
    createResource("Harry Potter and the chamber of secrets", "Rowling, J.K.", [
      { branchName: "Bowman", available: false },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 1, "Should merge books with different title capitalization");
  assert.strictEqual(result[0].holdingsInformations.length, 1);

  const holding = result[0].holdingsInformations[0] as any;
  assert.strictEqual(holding._quantityNotes, "2 copies (1 available)");

  // Should preserve first-encountered capitalization
  assert.strictEqual(result[0].shortTitle, "Harry Potter and the Chamber of Secrets");
});

test("deduplicateResults: case-insensitive author - same author with different capitalization", () => {
  const input = [
    createResource("The Gruffalo", "Donaldson, Julia.", [
      { branchName: "Bowman", available: true },
    ]),
    createResource("The Gruffalo", "Donaldson, JULIA.", [
      { branchName: "Bowman", available: false },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 1, "Should merge books with different author capitalization");
  assert.strictEqual(result[0].holdingsInformations.length, 1);

  const holding = result[0].holdingsInformations[0] as any;
  assert.strictEqual(holding._quantityNotes, "2 copies (1 available)");

  // Should preserve first-encountered author
  assert.strictEqual(result[0].shortAuthor, "Donaldson, Julia.");
});

test("deduplicateResults: case-insensitive branch - same branch with different capitalization", () => {
  const input = [
    createResource("Test Book", "Test Author", [
      { branchName: "Bowman", available: true },
      { branchName: "bowman", available: false },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].holdingsInformations.length, 1);

  const holding = result[0].holdingsInformations[0] as any;
  assert.strictEqual(holding._quantityNotes, "2 copies (1 available)");
  assert.strictEqual(holding.branchName, "Bowman", "Should preserve first-encountered branch capitalization");
});

test("deduplicateResults: case-insensitive call number - same call number with different capitalization", () => {
  const input = [
    createResource("Room on the Broom", "Donaldson", [
      { callPrefix: "J", callClass: "DON", callCutter: "ROM", branchName: "Bowman", available: true },
      { callPrefix: "j", callClass: "don", callCutter: "rom", branchName: "Bowman", available: false },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].holdingsInformations.length, 1);

  const holding = result[0].holdingsInformations[0] as any;
  assert.strictEqual(holding._quantityNotes, "2 copies (1 available)");
});

test("deduplicateResults: case-insensitive - multiple branches with different capitalization", () => {
  const input = [
    createResource("The Gruffalo", "Donaldson", [
      { branchName: "Bowman", available: true },
      { branchName: "bowman", available: false },
      { branchName: "Handley", available: true },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 1, "Should recognize Bowman/bowman as same branch");
  assert.strictEqual(result[0].holdingsInformations.length, 1);

  const holding = result[0].holdingsInformations[0] as any;
  assert.strictEqual(holding.branchName, "Multiple");

  // Should show 2 branches (Bowman with 2 copies, Handley with 1)
  assert.match(holding._branchDetails, /2 at Bowman \(1 available\)/);
  assert.match(holding._branchDetails, /1 at Handley \(1 available\)/);
});

test("deduplicateResults: case-insensitive - complex real-world scenario", () => {
  // Simulate API inconsistency: same book with various capitalization differences
  const input = [
    createResource("Harry Potter and the Chamber of Secrets", "Rowling, J.K.", [
      { callPrefix: "J", callClass: "ROW", callCutter: "HAR", branchName: "Bowman", available: true },
    ]),
    createResource("Harry Potter and the chamber of secrets", "Rowling, j.k.", [
      { callPrefix: "J", callClass: "row", callCutter: "har", branchName: "bowman", available: false },
    ]),
    createResource("Harry Potter and the Chamber Of Secrets", "Rowling, J.K.", [
      { callPrefix: "j", callClass: "ROW", callCutter: "HAR", branchName: "Handley", available: true },
    ]),
  ];

  const result = deduplicateResults(input);

  assert.strictEqual(result.length, 1, "Should merge all variations into single book");
  assert.strictEqual(result[0].holdingsInformations.length, 1);

  const holding = result[0].holdingsInformations[0] as any;
  assert.strictEqual(holding.branchName, "Multiple");

  // Verify original capitalization preserved from first encounter
  assert.strictEqual(result[0].shortTitle, "Harry Potter and the Chamber of Secrets");
  assert.strictEqual(result[0].shortAuthor, "Rowling, J.K.");
});
