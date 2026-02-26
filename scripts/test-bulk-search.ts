/**
 * Test script for bulk search functionality
 * Tests both single and multiple query scenarios with real API calls
 */

import { searchAndMerge } from "../src/lib/book-finder.js";
import { deduplicateResults } from "../src/lib/deduplicator.js";
import { formatAsCSV, type MergedResource } from "../src/lib/csv-formatter.js";
import { MAX_TOTAL_RESULTS } from "../src/lib/config.js";

// Simulate search_catalog tool logic
async function searchCatalog(queries: string | string[], options: {
  field?: string;
  branch?: string[];
  availableOnly?: boolean;
} = {}) {
  const queryArray = Array.isArray(queries) ? queries : [queries];
  const queryCount = queryArray.length;
  const limitPerQuery = Math.max(2, Math.floor(MAX_TOTAL_RESULTS / queryCount));

  const searchPromises = queryArray.map((q) =>
    searchAndMerge({
      query: q,
      apiField: "Title",
      limit: limitPerQuery,
      branches: options.branch,
      availableOnly: options.availableOnly || false,
    }).catch((error) => ({
      resources: [],
      totalHits: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }))
  );

  const results = await Promise.all(searchPromises);

  const allResources: MergedResource[] = [];
  let totalHits = 0;
  let failedQueries = 0;

  for (const result of results) {
    if ("error" in result) {
      failedQueries++;
    } else {
      allResources.push(...result.resources);
      totalHits += result.totalHits;
    }
  }

  if (allResources.length === 0) {
    return { text: `No results found. Total hits: ${totalHits}, Failed queries: ${failedQueries}`, failedQueries };
  }

  const deduplicatedResults = deduplicateResults(allResources, { mergeCallNumbers: true });
  const csvOutput = formatAsCSV(deduplicatedResults, {
    includeCallNumbers: false,
    includeBranch: true,
    includeStatus: true,
  });

  const finalOutput = failedQueries > 0
    ? `${csvOutput}\n\nNote: ${failedQueries} ${failedQueries === 1 ? "query" : "queries"} failed`
    : csvOutput;

  return { text: finalOutput, failedQueries };
}

async function testSingleQuery() {
  console.log("=".repeat(80));
  console.log("TEST 1: Single Query (existing behavior)");
  console.log("=".repeat(80));
  console.log("Query: 'Room on the Broom'");
  console.log(`Max total results: ${MAX_TOTAL_RESULTS}`);
  console.log();

  const result = await searchCatalog("Room on the Broom");
  const lines = result.text.split("\n");
  console.log(`Results: ${lines.length - 1} rows (excluding header)`);
  console.log(`First 5 lines:\n${lines.slice(0, 5).join("\n")}`);
  console.log();
}

async function testBulkSearch5Queries() {
  console.log("=".repeat(80));
  console.log("TEST 2: Bulk Search - 5 Queries");
  console.log("=".repeat(80));
  console.log("Queries: Julia Donaldson books");
  console.log(`Expected: ~${Math.floor(MAX_TOTAL_RESULTS / 5)} results per query (${MAX_TOTAL_RESULTS} total / 5 queries)`);
  console.log();

  const queries = [
    "Room on the Broom",
    "The Gruffalo",
    "Stick Man",
    "The Snail and the Whale",
    "Zog",
  ];

  const result = await searchCatalog(queries);
  const lines = result.text.split("\n");
  console.log(`Results: ${lines.length - 1} rows (excluding header)`);
  console.log(`First 10 lines:\n${lines.slice(0, 10).join("\n")}`);
  console.log();
  console.log(`Last 5 lines:\n${lines.slice(-5).join("\n")}`);
  console.log();
}

async function testBulkSearch20Queries() {
  console.log("=".repeat(80));
  console.log("TEST 3: Bulk Search - 20 Queries (max)");
  console.log("=".repeat(80));
  console.log("Queries: Popular children's books");
  console.log(`Expected: ${Math.max(2, Math.floor(MAX_TOTAL_RESULTS / 20))} results per query (${MAX_TOTAL_RESULTS} total / 20 queries)`);
  console.log();

  const queries = [
    "Room on the Broom",
    "The Gruffalo",
    "Goodnight Moon",
    "Where the Wild Things Are",
    "The Very Hungry Caterpillar",
    "Brown Bear Brown Bear",
    "Chicka Chicka Boom Boom",
    "Green Eggs and Ham",
    "Cat in the Hat",
    "Oh the Places You'll Go",
    "If You Give a Mouse a Cookie",
    "Pete the Cat",
    "Dog Man",
    "Diary of a Wimpy Kid",
    "Harry Potter",
    "Magic Tree House",
    "Captain Underpants",
    "The Giving Tree",
    "Corduroy",
    "Curious George",
  ];

  const result = await searchCatalog(queries);
  const lines = result.text.split("\n");
  console.log(`Results: ${lines.length - 1} rows (excluding header)`);
  console.log(`Note: Deduplication may reduce total (books appearing in multiple searches get merged)`);
  console.log();
  console.log(`First 10 lines:\n${lines.slice(0, 10).join("\n")}`);
  console.log();
  console.log(`Last 5 lines:\n${lines.slice(-5).join("\n")}`);
  console.log();
}

async function testBulkSearchWithFilters() {
  console.log("=".repeat(80));
  console.log("TEST 4: Bulk Search with Filters (branch + available_only)");
  console.log("=".repeat(80));
  console.log("Queries: 3 books");
  console.log("Filter: Bowman branch, available only");
  console.log(`Expected: ~${Math.floor(MAX_TOTAL_RESULTS / 3)} results per query (${MAX_TOTAL_RESULTS} total / 3 queries)`);
  console.log();

  const queries = ["Room on the Broom", "The Gruffalo", "Stick Man"];

  const result = await searchCatalog(queries, {
    branch: ["Bowman"],
    availableOnly: true,
  });

  const lines = result.text.split("\n");
  console.log(`Results: ${lines.length - 1} rows (excluding header)`);
  console.log(`First 10 lines:\n${lines.slice(0, 10).join("\n")}`);
  console.log();
}

async function testDeduplicationAcrossQueries() {
  console.log("=".repeat(80));
  console.log("TEST 5: Deduplication Across Multiple Queries");
  console.log("=".repeat(80));
  console.log("Queries: Same author search + specific title (intentional overlap)");
  console.log("Expected: Deduplication should merge books appearing in both searches");
  console.log();

  const queries = ["Julia Donaldson", "Room on the Broom"];

  const result = await searchCatalog(queries);
  const lines = result.text.split("\n");
  console.log(`Results: ${lines.length - 1} rows (excluding header)`);
  console.log(
    `First 10 lines (should show 'Room on the Broom' only once despite being in both searches):`
  );
  console.log(lines.slice(0, 10).join("\n"));
  console.log();
}

// Run all tests
async function runTests() {
  console.log("\n🧪 BULK SEARCH FEATURE VALIDATION");
  console.log("Testing bulk search with real API calls\n");

  try {
    await testSingleQuery();
    await testBulkSearch5Queries();
    await testBulkSearch20Queries();
    await testBulkSearchWithFilters();
    await testDeduplicationAcrossQueries();

    console.log("=".repeat(80));
    console.log("✅ ALL TESTS COMPLETED SUCCESSFULLY");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    process.exit(1);
  }
}

runTests();
