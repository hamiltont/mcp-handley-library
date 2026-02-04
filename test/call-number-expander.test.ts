/**
 * Tests for call number expansion logic
 */

import { test } from "node:test";
import assert from "node:assert";
import {
  expandCallNumber,
  expandCollectionCode,
  expandDeweyDecimal,
} from "../src/lib/call-number-expander.js";
import type { HoldingsInfo } from "../src/lib/api.js";

// --- Test: expandCollectionCode ---

test("expandCollectionCode: expands J to Juvenile Fiction", () => {
  assert.strictEqual(expandCollectionCode("J"), "Juvenile Fiction");
});

test("expandCollectionCode: expands JE to Juvenile Easy", () => {
  assert.strictEqual(expandCollectionCode("JE"), "Juvenile Easy");
});

test("expandCollectionCode: expands YA to Young Adult", () => {
  assert.strictEqual(expandCollectionCode("YA"), "Young Adult");
});

test("expandCollectionCode: expands FIC to Fiction", () => {
  assert.strictEqual(expandCollectionCode("FIC"), "Fiction");
});

test("expandCollectionCode: expands AB to Audiobook", () => {
  assert.strictEqual(expandCollectionCode("AB"), "Audiobook");
});

test("expandCollectionCode: expands E to Easy Reader", () => {
  assert.strictEqual(expandCollectionCode("E"), "Easy Reader");
});

test("expandCollectionCode: expands BR to Beginning Reader", () => {
  assert.strictEqual(expandCollectionCode("BR"), "Beginning Reader");
});

test("expandCollectionCode: expands GN to Graphic Novel", () => {
  assert.strictEqual(expandCollectionCode("GN"), "Graphic Novel");
});

test("expandCollectionCode: expands NF to Non-Fiction", () => {
  assert.strictEqual(expandCollectionCode("NF"), "Non-Fiction");
});

test("expandCollectionCode: expands B to Biography", () => {
  assert.strictEqual(expandCollectionCode("B"), "Biography");
});

test("expandCollectionCode: expands DVD to DVD", () => {
  assert.strictEqual(expandCollectionCode("DVD"), "DVD");
});

test("expandCollectionCode: expands CD to CD", () => {
  assert.strictEqual(expandCollectionCode("CD"), "CD");
});

test("expandCollectionCode: returns null for unknown codes", () => {
  assert.strictEqual(expandCollectionCode("XYZ"), null);
});

test("expandCollectionCode: returns null for Dewey numbers", () => {
  assert.strictEqual(expandCollectionCode("814.54"), null);
});

test("expandCollectionCode: handles case-insensitive input", () => {
  assert.strictEqual(expandCollectionCode("j"), "Juvenile Fiction");
  assert.strictEqual(expandCollectionCode("ya"), "Young Adult");
  assert.strictEqual(expandCollectionCode("fic"), "Fiction");
});

// --- Test: expandDeweyDecimal ---

test("expandDeweyDecimal: expands 000-099 to General Knowledge", () => {
  assert.strictEqual(expandDeweyDecimal("000"), "General Knowledge");
  assert.strictEqual(expandDeweyDecimal("001.5"), "General Knowledge");
  assert.strictEqual(expandDeweyDecimal("099.99"), "General Knowledge");
});

test("expandDeweyDecimal: expands 100-199 to Philosophy & Psychology", () => {
  assert.strictEqual(expandDeweyDecimal("100"), "Philosophy & Psychology");
  assert.strictEqual(expandDeweyDecimal("150.1"), "Philosophy & Psychology");
});

test("expandDeweyDecimal: expands 200-299 to Religion", () => {
  assert.strictEqual(expandDeweyDecimal("200"), "Religion");
  assert.strictEqual(expandDeweyDecimal("220.5"), "Religion");
});

test("expandDeweyDecimal: expands 300-399 to Social Sciences", () => {
  assert.strictEqual(expandDeweyDecimal("300"), "Social Sciences");
  assert.strictEqual(expandDeweyDecimal("320.973"), "Social Sciences");
});

test("expandDeweyDecimal: expands 400-499 to Languages", () => {
  assert.strictEqual(expandDeweyDecimal("400"), "Languages");
  assert.strictEqual(expandDeweyDecimal("420.1"), "Languages");
});

test("expandDeweyDecimal: expands 500-599 to Science", () => {
  assert.strictEqual(expandDeweyDecimal("500"), "Science");
  assert.strictEqual(expandDeweyDecimal("567.9"), "Science");
});

test("expandDeweyDecimal: expands 600-699 to Technology", () => {
  assert.strictEqual(expandDeweyDecimal("600"), "Technology");
  assert.strictEqual(expandDeweyDecimal("641.5"), "Technology");
});

test("expandDeweyDecimal: expands 700-799 to Arts & Recreation", () => {
  assert.strictEqual(expandDeweyDecimal("700"), "Arts & Recreation");
  assert.strictEqual(expandDeweyDecimal("780.92"), "Arts & Recreation");
});

test("expandDeweyDecimal: expands 800-899 to Literature", () => {
  assert.strictEqual(expandDeweyDecimal("800"), "Literature");
  assert.strictEqual(expandDeweyDecimal("814.54"), "Literature");
  assert.strictEqual(expandDeweyDecimal("823.912"), "Literature");
});

test("expandDeweyDecimal: expands 900-999 to History & Geography", () => {
  assert.strictEqual(expandDeweyDecimal("900"), "History & Geography");
  assert.strictEqual(expandDeweyDecimal("973.7"), "History & Geography");
});

test("expandDeweyDecimal: returns null for non-Dewey numbers", () => {
  assert.strictEqual(expandDeweyDecimal("J"), null);
  assert.strictEqual(expandDeweyDecimal("FIC"), null);
  assert.strictEqual(expandDeweyDecimal("ABC"), null);
});

test("expandDeweyDecimal: returns null for invalid Dewey numbers", () => {
  assert.strictEqual(expandDeweyDecimal("1000"), null);
  assert.strictEqual(expandDeweyDecimal("-50"), null);
});

// --- Test: expandCallNumber ---

test("expandCallNumber: expands J prefix", () => {
  const holding: HoldingsInfo = {
    callPrefix: null,
    callClass: "J",
    callCutter: "DON",
  } as HoldingsInfo;

  assert.strictEqual(expandCallNumber(holding), "Juvenile Fiction J DON");
});

test("expandCallNumber: expands JE prefix", () => {
  const holding: HoldingsInfo = {
    callPrefix: null,
    callClass: "JE",
    callCutter: "Carle",
  } as HoldingsInfo;

  assert.strictEqual(expandCallNumber(holding), "Juvenile Easy JE Carle");
});

test("expandCallNumber: expands YA prefix", () => {
  const holding: HoldingsInfo = {
    callPrefix: null,
    callClass: "YA",
    callCutter: "Meyer",
  } as HoldingsInfo;

  assert.strictEqual(expandCallNumber(holding), "Young Adult YA Meyer");
});

test("expandCallNumber: expands FIC prefix", () => {
  const holding: HoldingsInfo = {
    callPrefix: null,
    callClass: "FIC",
    callCutter: "Smith",
  } as HoldingsInfo;

  assert.strictEqual(expandCallNumber(holding), "Fiction FIC Smith");
});

test("expandCallNumber: expands AB prefix", () => {
  const holding: HoldingsInfo = {
    callPrefix: null,
    callClass: "AB",
    callCutter: "SEN",
  } as HoldingsInfo;

  assert.strictEqual(expandCallNumber(holding), "Audiobook AB SEN");
});

test("expandCallNumber: expands Dewey Decimal numbers", () => {
  const holding: HoldingsInfo = {
    callPrefix: null,
    callClass: "814.54",
    callCutter: "Johnson",
  } as HoldingsInfo;

  assert.strictEqual(expandCallNumber(holding), "Literature 814.54 Johnson");
});

test("expandCallNumber: expands Science Dewey numbers", () => {
  const holding: HoldingsInfo = {
    callPrefix: null,
    callClass: "567.9",
    callCutter: "Davis",
  } as HoldingsInfo;

  assert.strictEqual(expandCallNumber(holding), "Science 567.9 Davis");
});

test("expandCallNumber: handles callPrefix with collection code", () => {
  const holding: HoldingsInfo = {
    callPrefix: "J",
    callClass: "FIC",
    callCutter: "Brown",
  } as HoldingsInfo;

  // When there's a prefix, it takes precedence for expansion
  assert.strictEqual(expandCallNumber(holding), "Juvenile Fiction J FIC Brown");
});

test("expandCallNumber: handles callPrefix with Dewey number", () => {
  const holding: HoldingsInfo = {
    callPrefix: "R",
    callClass: "641.5",
    callCutter: "Smith",
  } as HoldingsInfo;

  // R is Reference - but if not in our mapping, we try Dewey on callClass
  assert.strictEqual(expandCallNumber(holding), "Technology R 641.5 Smith");
});

test("expandCallNumber: handles missing callCutter", () => {
  const holding: HoldingsInfo = {
    callPrefix: null,
    callClass: "J",
    callCutter: "",
  } as HoldingsInfo;

  assert.strictEqual(expandCallNumber(holding), "Juvenile Fiction J");
});

test("expandCallNumber: handles all empty fields", () => {
  const holding: HoldingsInfo = {
    callPrefix: null,
    callClass: "",
    callCutter: "",
  } as HoldingsInfo;

  assert.strictEqual(expandCallNumber(holding), "");
});

test("expandCallNumber: handles unknown collection code gracefully", () => {
  const holding: HoldingsInfo = {
    callPrefix: null,
    callClass: "UNKNOWN",
    callCutter: "Test",
  } as HoldingsInfo;

  // If we can't expand, return as-is
  assert.strictEqual(expandCallNumber(holding), "UNKNOWN Test");
});

test("expandCallNumber: handles numeric callClass that's not Dewey", () => {
  const holding: HoldingsInfo = {
    callPrefix: null,
    callClass: "2024",
    callCutter: "Smith",
  } as HoldingsInfo;

  // Not a valid Dewey range, return as-is
  assert.strictEqual(expandCallNumber(holding), "2024 Smith");
});

test("expandCallNumber: preserves original call number components", () => {
  const holding: HoldingsInfo = {
    callPrefix: "REF",
    callClass: "641.5",
    callCutter: "Smith",
  } as HoldingsInfo;

  const result = expandCallNumber(holding);
  
  // Should include Technology expansion for Dewey 641.5
  assert.ok(result.includes("REF"));
  assert.ok(result.includes("641.5"));
  assert.ok(result.includes("Smith"));
  assert.ok(result.includes("Technology"));
});
