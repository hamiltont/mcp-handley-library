/**
 * Integration tests for deduplication with real API data
 */

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { AvailabilityResponse, SearchResponse } from "../src/lib/api.js";
import { formatAsCSV, type MergedResource } from "../src/lib/csv-formatter.js";
import { deduplicateResults } from "../src/lib/deduplicator.js";

/**
 * Helper to merge search results with availability data
 * (mirrors the logic in find-books.ts)
 */
function mergeSearchWithAvailability(
  searchResponse: SearchResponse,
  availabilityResponse: AvailabilityResponse
): MergedResource[] {
  const availabilityMap = new Map(
    availabilityResponse.itemAvailabilities.map((item) => [
      item.itemIdentifier,
      item,
    ])
  );

  return searchResponse.resources.map((resource) => ({
    ...resource,
    holdingsInformations: resource.holdingsInformations.map((holding) => ({
      ...holding,
      availability: availabilityMap.get(holding.barcode) || null,
    })),
  }));
}

test("integration: Harry Potter data shows significant deduplication", () => {
  // Load real API data
  const searchData: SearchResponse = JSON.parse(
    readFileSync("test/samples/search-harry-potter.json", "utf-8")
  );
  const availabilityData: AvailabilityResponse = JSON.parse(
    readFileSync("test/samples/availability-harry-potter.json", "utf-8")
  );

  // Merge data
  const merged = mergeSearchWithAvailability(searchData, availabilityData);

  console.log(`\n📊 Harry Potter Integration Test:`);
  console.log(`   Resources: ${merged.length}`);
  console.log(`   Total holdings: ${merged.reduce((sum, r) => sum + r.holdingsInformations.length, 0)}`);

  // Deduplicate
  const deduplicated = deduplicateResults(merged);

  console.log(`   After deduplication: ${deduplicated.length} resources`);
  console.log(`   Total holdings: ${deduplicated.reduce((sum, r) => sum + r.holdingsInformations.length, 0)}`);

  // Verify deduplication reduced the number of holdings
  const originalHoldingsCount = merged.reduce((sum, r) => sum + r.holdingsInformations.length, 0);
  const deduplicatedHoldingsCount = deduplicated.reduce((sum, r) => sum + r.holdingsInformations.length, 0);
  
  assert.ok(
    deduplicatedHoldingsCount < originalHoldingsCount,
    `Deduplication should reduce holdings count (${originalHoldingsCount} -> ${deduplicatedHoldingsCount})`
  );

  // Generate CSV outputs for comparison
  const csvBefore = formatAsCSV(merged);
  const csvAfter = formatAsCSV(deduplicated);

  const linesBefore = csvBefore.split('\n').length - 1; // Subtract header
  const linesAfter = csvAfter.split('\n').length - 1;
  
  console.log(`   CSV rows before: ${linesBefore}`);
  console.log(`   CSV rows after: ${linesAfter}`);
  console.log(`   Reduction: ${((1 - linesAfter / linesBefore) * 100).toFixed(1)}%\n`);

  // Show sample of deduplicated output
  const sampleLines = csvAfter.split('\n').slice(0, 6);
  console.log(`   Sample output (first 5 rows):`);
  sampleLines.forEach(line => console.log(`   ${line}`));
  console.log('');

  assert.ok(
    linesAfter < linesBefore,
    `CSV should have fewer rows after deduplication (${linesBefore} -> ${linesAfter})`
  );
});

test("integration: Dog Man data deduplication", () => {
  const searchData: SearchResponse = JSON.parse(
    readFileSync("test/samples/search-dog-man.json", "utf-8")
  );

  // For Dog Man, we don't have availability data, so create a mock
  const mockAvailability: AvailabilityResponse = {
    itemAvailabilities: searchData.resources.flatMap((r) =>
      r.holdingsInformations.map((h, idx) => ({
        itemIdentifier: h.barcode,
        available: idx % 2 === 0, // Mock: alternating availability
        status: idx % 2 === 0 ? "Available" : "Checked Out",
        statusCode: idx % 2 === 0 ? "I" : "O",
      }))
    ),
  };

  const merged = mergeSearchWithAvailability(searchData, mockAvailability);
  const deduplicated = deduplicateResults(merged);

  console.log(`\n📊 Dog Man Integration Test:`);
  console.log(`   Resources: ${merged.length}`);
  console.log(`   Holdings before: ${merged.reduce((sum, r) => sum + r.holdingsInformations.length, 0)}`);
  console.log(`   Holdings after: ${deduplicated.reduce((sum, r) => sum + r.holdingsInformations.length, 0)}\n`);

  // Should have reduced holdings
  const originalCount = merged.reduce((sum, r) => sum + r.holdingsInformations.length, 0);
  const deduplicatedCount = deduplicated.reduce((sum, r) => sum + r.holdingsInformations.length, 0);
  
  assert.ok(
    deduplicatedCount <= originalCount,
    "Deduplication should not increase holdings count"
  );
});

test("integration: Pete the Cat data deduplication", () => {
  const searchData: SearchResponse = JSON.parse(
    readFileSync("test/samples/search-pete-the-cat.json", "utf-8")
  );

  // Mock availability
  const mockAvailability: AvailabilityResponse = {
    itemAvailabilities: searchData.resources.flatMap((r) =>
      r.holdingsInformations.map((h, idx) => ({
        itemIdentifier: h.barcode,
        available: idx % 3 === 0, // Mock: every 3rd is available
        status: idx % 3 === 0 ? "Available" : "Checked Out",
        statusCode: idx % 3 === 0 ? "I" : "O",
      }))
    ),
  };

  const merged = mergeSearchWithAvailability(searchData, mockAvailability);
  const deduplicated = deduplicateResults(merged);

  console.log(`\n📊 Pete the Cat Integration Test:`);
  console.log(`   Resources: ${merged.length}`);
  console.log(`   Holdings before: ${merged.reduce((sum, r) => sum + r.holdingsInformations.length, 0)}`);
  console.log(`   Holdings after: ${deduplicated.reduce((sum, r) => sum + r.holdingsInformations.length, 0)}\n`);

  const originalCount = merged.reduce((sum, r) => sum + r.holdingsInformations.length, 0);
  const deduplicatedCount = deduplicated.reduce((sum, r) => sum + r.holdingsInformations.length, 0);
  
  assert.ok(
    deduplicatedCount <= originalCount,
    "Deduplication should not increase holdings count"
  );
});
