/**
 * Tests for core book-finder logic
 */

import assert from "node:assert";
import { test } from "node:test";
import { applyAvailabilityFilter, applyBranchFilter } from "../src/lib/book-finder.js";
import type { MergedHolding, MergedResource } from "../src/lib/csv-formatter.js";

// Helper to create test resources
function createResource(
  title: string,
  holdings: Array<{
    branchName: string;
    available: boolean;
    callClass?: string;
  }>
): MergedResource {
  return {
    id: 1,
    shortTitle: title,
    shortAuthor: "Test Author",
    format: "Book",
    holdingsInformations: holdings.map((h, idx) => ({
      barcode: `BARCODE${idx}`,
      branchName: h.branchName,
      collectionName: "Fiction",
      callPrefix: null,
      callClass: h.callClass || "TEST",
      callCutter: "TST",
      availability: {
        itemIdentifier: `BARCODE${idx}`,
        available: h.available,
        status: h.available ? "Available" : "Checked Out",
        statusCode: h.available ? "I" : "O",
      },
    } as MergedHolding)),
  } as MergedResource;
}

// --- Tests: applyBranchFilter ---

test("applyBranchFilter: filters to specified branches", () => {
  const resources = [
    createResource("Book 1", [
      { branchName: "Bowman", available: true },
      { branchName: "Handley", available: true },
    ]),
    createResource("Book 2", [{ branchName: "Clarke County", available: true }]),
  ];

  const filtered = applyBranchFilter(resources, ["Bowman"]);

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].shortTitle, "Book 1");
  assert.strictEqual(filtered[0].holdingsInformations.length, 1);
  assert.strictEqual(filtered[0].holdingsInformations[0].branchName, "Bowman");
});

test("applyBranchFilter: removes resources with no matching branches", () => {
  const resources = [
    createResource("Book 1", [{ branchName: "Bowman", available: true }]),
    createResource("Book 2", [{ branchName: "Handley", available: true }]),
  ];

  const filtered = applyBranchFilter(resources, ["Clarke County"]);

  assert.strictEqual(filtered.length, 0);
});

test("applyBranchFilter: handles multiple branch filter", () => {
  const resources = [
    createResource("Book 1", [{ branchName: "Bowman", available: true }]),
    createResource("Book 2", [{ branchName: "Handley", available: true }]),
    createResource("Book 3", [{ branchName: "Clarke County", available: true }]),
  ];

  const filtered = applyBranchFilter(resources, ["Bowman", "Handley"]);

  assert.strictEqual(filtered.length, 2);
  assert.strictEqual(filtered[0].shortTitle, "Book 1");
  assert.strictEqual(filtered[1].shortTitle, "Book 2");
});

test("applyBranchFilter: preserves resources with multiple holdings at different branches", () => {
  const resources = [
    createResource("Book 1", [
      { branchName: "Bowman", available: true },
      { branchName: "Handley", available: true },
      { branchName: "Clarke County", available: false },
    ]),
  ];

  const filtered = applyBranchFilter(resources, ["Bowman", "Handley"]);

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].holdingsInformations.length, 2);
  assert.strictEqual(filtered[0].holdingsInformations[0].branchName, "Bowman");
  assert.strictEqual(filtered[0].holdingsInformations[1].branchName, "Handley");
});

// --- Tests: applyAvailabilityFilter ---

test("applyAvailabilityFilter: keeps resources with available copies", () => {
  const resources = [
    createResource("Book 1", [{ branchName: "Bowman", available: true }]),
    createResource("Book 2", [{ branchName: "Handley", available: false }]),
  ];

  const filtered = applyAvailabilityFilter(resources);

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].shortTitle, "Book 1");
});

test("applyAvailabilityFilter: removes resources with no available copies", () => {
  const resources = [
    createResource("Book 1", [
      { branchName: "Bowman", available: false },
      { branchName: "Handley", available: false },
    ]),
  ];

  const filtered = applyAvailabilityFilter(resources);

  assert.strictEqual(filtered.length, 0);
});

test("applyAvailabilityFilter: keeps resource if ANY copy is available", () => {
  const resources = [
    createResource("Book 1", [
      { branchName: "Bowman", available: false },
      { branchName: "Handley", available: true },
      { branchName: "Clarke County", available: false },
    ]),
  ];

  const filtered = applyAvailabilityFilter(resources);

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].holdingsInformations.length, 3);
});

test("applyAvailabilityFilter: handles empty availability (null)", () => {
  const resource: MergedResource = {
    id: 1,
    shortTitle: "Book 1",
    shortAuthor: "Test Author",
    format: "Book",
    holdingsInformations: [
      {
        barcode: "BARCODE1",
        branchName: "Bowman",
        collectionName: "Fiction",
        callPrefix: null,
        callClass: "TEST",
        callCutter: "TST",
        availability: null, // No availability data
      } as MergedHolding,
    ],
  } as MergedResource;

  const filtered = applyAvailabilityFilter([resource]);

  assert.strictEqual(filtered.length, 0);
});

// --- Combined filter tests ---

test("combined filters: branch then availability", () => {
  const resources = [
    createResource("Book 1", [
      { branchName: "Bowman", available: true },
      { branchName: "Handley", available: false },
    ]),
    createResource("Book 2", [
      { branchName: "Bowman", available: false },
      { branchName: "Clarke County", available: true },
    ]),
    createResource("Book 3", [{ branchName: "Handley", available: true }]),
  ];

  // First filter by branch
  let filtered = applyBranchFilter(resources, ["Bowman", "Handley"]);
  assert.strictEqual(filtered.length, 3);

  // Then filter by availability
  filtered = applyAvailabilityFilter(filtered);
  assert.strictEqual(filtered.length, 2); // Book 1 and Book 3
  assert.strictEqual(filtered[0].shortTitle, "Book 1");
  assert.strictEqual(filtered[1].shortTitle, "Book 3");
});
