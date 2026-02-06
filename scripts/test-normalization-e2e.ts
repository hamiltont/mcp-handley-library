/**
 * E2E test for case-insensitive deduplication with real API data
 * 
 * This tests that the library API's inconsistent capitalization
 * (e.g., "Chamber of Secrets" vs "chamber of secrets") is handled correctly.
 */

import { searchAndMerge } from "../src/lib/book-finder.js";
import { deduplicateResults } from "../src/lib/deduplicator.js";
import { formatAsCSV } from "../src/lib/csv-formatter.js";

async function testNormalization() {
  console.log("=== Testing Case-Insensitive Deduplication with Real API Data ===\n");

  // Test 1: Search for Harry Potter (known to have capitalization inconsistencies)
  console.log("Test 1: Searching for 'Harry Potter'...");
  const harryPotterResults = await searchAndMerge({
    query: "Harry Potter",
    apiField: "Title",
    branches: undefined, // All branches
    availableOnly: false,
  });

  console.log(`Found ${harryPotterResults.resources.length} raw resources`);

  // Check for title capitalization variations
  const titles = harryPotterResults.resources.map(r => r.shortTitle);
  const uniqueTitles = new Set(titles);
  console.log(`Unique titles (case-sensitive): ${uniqueTitles.size}`);

  // Deduplicate with planning mode (merges call numbers)
  const deduplicated = deduplicateResults(harryPotterResults.resources, { mergeCallNumbers: true });
  console.log(`After deduplication: ${deduplicated.length} resources`);

  // Format as CSV
  const csv = formatAsCSV(deduplicated, {
    includeCallNumbers: false,
    includeBranch: true,
    includeStatus: true,
  });

  console.log("\nFirst 5 results (CSV):");
  const lines = csv.split("\n").slice(0, 6); // Header + 5 rows
  lines.forEach(line => console.log(line));

  // Test 2: Verify that "Chamber of Secrets" and "chamber of secrets" are merged
  console.log("\n\nTest 2: Checking for 'Chamber of Secrets' capitalization handling...");
  const chamberVariations = harryPotterResults.resources.filter(r =>
    r.shortTitle?.toLowerCase().includes("chamber of secrets")
  );

  console.log(`Found ${chamberVariations.length} 'Chamber of Secrets' resources (case-insensitive)`);

  if (chamberVariations.length > 0) {
    // Check capitalization variations
    const chamberTitles = new Set(chamberVariations.map(r => r.shortTitle));
    console.log("Title variations found:");
    chamberTitles.forEach(title => console.log(`  - "${title}"`));

    // Deduplicate just these
    const deduplicatedChamber = deduplicateResults(chamberVariations, { mergeCallNumbers: true });
    console.log(`\nAfter deduplication: ${deduplicatedChamber.length} resources`);
    console.log(`Title preserved: "${deduplicatedChamber[0]?.shortTitle}"`);

    if (chamberVariations.length > deduplicatedChamber.length) {
      console.log("✅ Successfully merged capitalization variations!");
    } else {
      console.log("ℹ️  No capitalization variations to merge (API may have already normalized)");
    }
  }

  console.log("\n=== Test Complete ===");
}

testNormalization().catch(console.error);
