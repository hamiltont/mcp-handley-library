/**
 * Integration tests for CSV formatting with real API data
 */

import { readFileSync } from "fs";
import assert from "node:assert";
import { test } from "node:test";
import type { AvailabilityResponse, SearchResponse } from "../src/lib/api.js";
import { formatAsCSV, type MergedResource } from "../src/lib/csv-formatter.js";

test("formatAsCSV: handles real Julia Donaldson search results", () => {
  // Load real API responses
  const searchData: SearchResponse = JSON.parse(
    readFileSync("test/samples/search-julia-donaldson.json", "utf-8")
  );
  const availabilityData: AvailabilityResponse = JSON.parse(
    readFileSync("test/samples/availability-julia-donaldson.json", "utf-8")
  );

  // Merge data (simulating what find-books tool does)
  const availabilityMap = new Map(
    availabilityData.itemAvailabilities.map((item) => [item.itemIdentifier, item])
  );

  const mergedResults: MergedResource[] = searchData.resources.map((resource) => ({
    ...resource,
    holdingsInformations: resource.holdingsInformations.map((holding) => ({
      ...holding,
      availability: availabilityMap.get(holding.barcode) || null,
    })),
  }));

  // Transform to CSV
  const csv = formatAsCSV(mergedResults);
  const lines = csv.split("\n");

  // Verify header
  assert.strictEqual(lines[0], "Title,Author,Call#,Branch,Status,Notes");

  // Verify we have results (header + data rows)
  assert.ok(lines.length > 1, "Should have at least one data row");

  // Verify first row structure (from real API data)
  const firstDataRow = lines[1];
  const fields = firstDataRow.split(",");

  // Should have 6 fields (some may be quoted)
  assert.ok(fields.length >= 5, `Should have at least 5 fields, got ${fields.length}`);

  // Title should not be empty
  assert.ok(fields[0].length > 0, "Title should not be empty");

  // Author should contain "Donaldson" (possibly quoted)
  assert.ok(
    firstDataRow.includes("Donaldson"),
    "Author field should contain 'Donaldson'"
  );

  // Should have a call number
  assert.ok(
    firstDataRow.includes("J") || firstDataRow.includes("FIC"),
    "Should have a call number"
  );

  // Should have a branch name
  assert.ok(
    firstDataRow.includes("Bowman") || firstDataRow.includes("Handley"),
    "Should have a branch name"
  );

  // Should have a status
  assert.ok(
    firstDataRow.includes("Available") || firstDataRow.includes("Checked Out"),
    "Should have availability status"
  );

  console.log("\nSample CSV output (first 3 rows):");
  console.log(lines.slice(0, 3).join("\n"));
});

test("formatAsCSV: handles real Room on the Broom search", () => {
  const searchData: SearchResponse = JSON.parse(
    readFileSync("test/samples/search-room-on-broom.json", "utf-8")
  );

  // For this test, just verify it doesn't crash with real data structure
  const mergedResults: MergedResource[] = searchData.resources.map((resource) => ({
    ...resource,
    holdingsInformations: resource.holdingsInformations.map((holding) => ({
      ...holding,
      availability: { available: true } as any,
    })),
  }));

  const csv = formatAsCSV(mergedResults);
  const lines = csv.split("\n");

  assert.strictEqual(lines[0], "Title,Author,Call#,Branch,Status,Notes");
  assert.ok(lines.length > 1, "Should have data rows");
  assert.ok(lines[1].includes("Room"), "Should include title");
});

test("formatAsCSV: handles real parenting search (mixed formats)", () => {
  const searchData: SearchResponse = JSON.parse(
    readFileSync("test/samples/search-parenting.json", "utf-8")
  );

  const mergedResults: MergedResource[] = searchData.resources.map((resource) => ({
    ...resource,
    holdingsInformations: resource.holdingsInformations.map((holding) => ({
      ...holding,
      availability: { available: true } as any,
    })),
  }));

  const csv = formatAsCSV(mergedResults);
  const lines = csv.split("\n");

  assert.strictEqual(lines[0], "Title,Author,Call#,Branch,Status,Notes");
  assert.ok(lines.length > 1, "Should have data rows");

  // Check if any non-book formats appear in the data
  const formats = searchData.resources.map((r) => r.format);
  const hasNonBookFormats = formats.some(
    (f) => f && !f.toLowerCase().includes("book") && f.toLowerCase() !== "book"
  );

  if (hasNonBookFormats) {
    console.log("\nFormats found in parenting search:", [...new Set(formats)]);
  }
});
