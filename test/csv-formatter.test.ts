/**
 * Tests for CSV formatting functions
 */

import assert from "node:assert";
import { test } from "node:test";
import type { HoldingsInfo, ItemAvailability, Resource } from "../src/lib/api.js";
import {
    buildCallNumber,
    buildNotes,
    escapeCsvField,
    formatAsCSV,
    getStatus,
    type MergedHolding,
    type MergedResource,
} from "../src/lib/csv-formatter.js";

// --- Test: buildCallNumber ---

test("buildCallNumber: combines all parts with expansion", () => {
  const holding = {
    callPrefix: "J",
    callClass: "FIC",
    callCutter: "DON",
  } as HoldingsInfo;

  assert.strictEqual(buildCallNumber(holding), "Juvenile Fiction J FIC DON");
});

test("buildCallNumber: expands Dewey Decimal numbers", () => {
  const holding = {
    callPrefix: null,
    callClass: "814.54",
    callCutter: "Qui",
  } as HoldingsInfo;

  assert.strictEqual(buildCallNumber(holding), "Literature 814.54 Qui");
});

test("buildCallNumber: expands collection codes", () => {
  const holding = {
    callPrefix: null,
    callClass: "J",
    callCutter: "DON",
  } as HoldingsInfo;

  assert.strictEqual(buildCallNumber(holding), "Juvenile Fiction J DON");
});

test("buildCallNumber: handles empty parts", () => {
  const holding = {
    callPrefix: null,
    callClass: "",
    callCutter: "",
  } as HoldingsInfo;

  assert.strictEqual(buildCallNumber(holding), "");
});

// --- Test: getStatus ---

test("getStatus: returns Available when available is true", () => {
  const availability = {
    available: true,
    status: "Checked In",
  } as ItemAvailability;

  assert.strictEqual(getStatus(availability), "Available");
});

test("getStatus: returns Checked Out when available is false", () => {
  const availability = {
    available: false,
    status: "Charged",
  } as ItemAvailability;

  assert.strictEqual(getStatus(availability), "Checked Out");
});

test("getStatus: returns Unknown when availability is null", () => {
  assert.strictEqual(getStatus(null), "Unknown");
});

// --- Test: buildNotes ---

test("buildNotes: returns empty for standard Book format", () => {
  const resource = { format: "Book" } as Resource;
  const holding = { availability: null } as MergedHolding;

  assert.strictEqual(buildNotes(resource, holding), "");
});

test("buildNotes: identifies Audiobook format", () => {
  const resource = { format: "Audiobook" } as Resource;
  const holding = { availability: null } as MergedHolding;

  assert.strictEqual(buildNotes(resource, holding), "Audiobook");
});

test("buildNotes: identifies Audio Book format (with space)", () => {
  const resource = { format: "Audio Book" } as Resource;
  const holding = { availability: null } as MergedHolding;

  assert.strictEqual(buildNotes(resource, holding), "Audiobook");
});

test("buildNotes: identifies eBook format", () => {
  const resource = { format: "eBook" } as Resource;
  const holding = { availability: null } as MergedHolding;

  assert.strictEqual(buildNotes(resource, holding), "eBook");
});

test("buildNotes: identifies DVD format", () => {
  const resource = { format: "DVD" } as Resource;
  const holding = { availability: null } as MergedHolding;

  assert.strictEqual(buildNotes(resource, holding), "DVD");
});

test("buildNotes: includes due date for checked out items", () => {
  const resource = { format: "Book" } as Resource;
  const holding = {
    availability: {
      available: false,
      dueDate: "2026-02-10",
    } as ItemAvailability,
  } as MergedHolding;

  assert.strictEqual(buildNotes(resource, holding), "Due: 2026-02-10");
});

test("buildNotes: combines format and due date", () => {
  const resource = { format: "Audiobook" } as Resource;
  const holding = {
    availability: {
      available: false,
      dueDate: "2026-02-10",
    } as ItemAvailability,
  } as MergedHolding;

  assert.strictEqual(buildNotes(resource, holding), "Audiobook | Due: 2026-02-10");
});

test("buildNotes: handles null format", () => {
  const resource = { format: null } as any;
  const holding = { availability: null } as MergedHolding;

  assert.strictEqual(buildNotes(resource, holding), "");
});

// --- Test: escapeCsvField ---

test("escapeCsvField: leaves simple strings unchanged", () => {
  assert.strictEqual(escapeCsvField("simple"), "simple");
  assert.strictEqual(escapeCsvField("Title Here"), "Title Here");
});

test("escapeCsvField: wraps strings with commas in quotes", () => {
  assert.strictEqual(escapeCsvField("Title, The"), '"Title, The"');
});

test("escapeCsvField: escapes existing quotes", () => {
  assert.strictEqual(escapeCsvField('Title "quoted"'), '"Title ""quoted"""');
});

test("escapeCsvField: handles newlines", () => {
  assert.strictEqual(escapeCsvField("Line1\nLine2"), '"Line1\nLine2"');
});

// --- Test: formatAsCSV ---

test("formatAsCSV: formats single book correctly", () => {
  const results: MergedResource[] = [
    {
      shortTitle: "The Very Hungry Caterpillar",
      shortAuthor: "Carle, Eric.",
      format: "Book",
      holdingsInformations: [
        {
          callPrefix: null,
          callClass: "JE",
          callCutter: "Carle",
          branchName: "Bowman",
          availability: {
            available: true,
            status: "Checked In",
          } as ItemAvailability,
        } as MergedHolding,
      ],
    } as MergedResource,
  ];

  const csv = formatAsCSV(results);
  const lines = csv.split("\n");

  assert.strictEqual(lines.length, 2);
  assert.strictEqual(lines[0], "Title,Author,Call#,Branch,Status,Notes");
  assert.strictEqual(lines[1], 'The Very Hungry Caterpillar,"Carle, Eric.",Juvenile Easy JE Carle,Bowman,Available,');
});

test("formatAsCSV: formats multiple holdings per book", () => {
  const results: MergedResource[] = [
    {
      shortTitle: "Room on the Broom",
      shortAuthor: "Donaldson, Julia.",
      format: "Book",
      holdingsInformations: [
        {
          callPrefix: null,
          callClass: "J",
          callCutter: "DON",
          branchName: "Bowman",
          availability: { available: true } as ItemAvailability,
        } as MergedHolding,
        {
          callPrefix: null,
          callClass: "J",
          callCutter: "DON",
          branchName: "Handley",
          availability: { available: false } as ItemAvailability,
        } as MergedHolding,
      ],
    } as MergedResource,
  ];

  const csv = formatAsCSV(results);
  const lines = csv.split("\n");

  assert.strictEqual(lines.length, 3); // header + 2 holdings
  assert.strictEqual(lines[1], 'Room on the Broom,"Donaldson, Julia.",Juvenile Fiction J DON,Bowman,Available,');
  assert.strictEqual(lines[2], 'Room on the Broom,"Donaldson, Julia.",Juvenile Fiction J DON,Handley,Checked Out,');
});

test("formatAsCSV: formats book with clearer call number example", () => {
  const results: MergedResource[] = [
    {
      shortTitle: "Brown Bear, Brown Bear, What Do You See?",
      shortAuthor: "Martin, Bill.",
      format: "Book",
      holdingsInformations: [
        {
          callPrefix: null,
          callClass: "JE",
          callCutter: "Martin",
          branchName: "Bowman",
          availability: { available: true } as ItemAvailability,
        } as MergedHolding,
      ],
    } as MergedResource,
  ];

  const csv = formatAsCSV(results);
  const lines = csv.split("\n");

  assert.strictEqual(lines.length, 2);
  assert.strictEqual(
    lines[1],
    '"Brown Bear, Brown Bear, What Do You See?","Martin, Bill.",Juvenile Easy JE Martin,Bowman,Available,'
  );
});

test("formatAsCSV: handles titles with commas", () => {
  const results: MergedResource[] = [
    {
      shortTitle: "Title, The: A Subtitle",
      shortAuthor: "Author Name",
      format: "Book",
      holdingsInformations: [
        {
          callPrefix: null,
          callClass: "FIC",
          callCutter: "AUT",
          branchName: "Bowman",
          availability: { available: true } as ItemAvailability,
        } as MergedHolding,
      ],
    } as MergedResource,
  ];

  const csv = formatAsCSV(results);
  const lines = csv.split("\n");

  assert.strictEqual(lines[1], '"Title, The: A Subtitle",Author Name,Fiction FIC AUT,Bowman,Available,');
});

test("formatAsCSV: includes media type in notes", () => {
  const results: MergedResource[] = [
    {
      shortTitle: "Where the Wild Things Are",
      shortAuthor: "Sendak, Maurice",
      format: "Audiobook",
      holdingsInformations: [
        {
          callPrefix: null,
          callClass: "AB",
          callCutter: "SEN",
          branchName: "Digital",
          availability: { available: true } as ItemAvailability,
        } as MergedHolding,
      ],
    } as MergedResource,
  ];

  const csv = formatAsCSV(results);
  const lines = csv.split("\n");

  assert.strictEqual(
    lines[1],
    'Where the Wild Things Are,"Sendak, Maurice",Audiobook AB SEN,Digital,Available,Audiobook'
  );
});

test("formatAsCSV: handles empty results", () => {
  const csv = formatAsCSV([]);
  assert.strictEqual(csv, "Title,Author,Call#,Branch,Status,Notes");
});

test("formatAsCSV: handles missing fields gracefully", () => {
  const results: MergedResource[] = [
    {
      shortTitle: "",
      shortAuthor: "",
      format: "",
      holdingsInformations: [
        {
          callPrefix: null,
          callClass: "",
          callCutter: "",
          branchName: "",
          availability: null,
        } as MergedHolding,
      ],
    } as MergedResource,
  ];

  const csv = formatAsCSV(results);
  const lines = csv.split("\n");

  assert.strictEqual(lines[1], ",,,,Unknown,");
});
