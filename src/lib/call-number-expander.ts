/**
 * Call number expansion utilities
 * Converts library collection codes and Dewey Decimal numbers to human-readable descriptions
 */

import type { HoldingsInfo } from "./api.js";

/**
 * Collection code mappings to human-readable descriptions
 */
const COLLECTION_CODE_MAP: Record<string, string> = {
  // Juvenile collections
  J: "Juvenile Fiction",
  JE: "Juvenile Easy",
  E: "Easy Reader",
  BR: "Beginning Reader",
  
  // Young adult
  YA: "Young Adult",
  
  // Adult fiction
  FIC: "Fiction",
  
  // Media formats
  AB: "Audiobook",
  DVD: "DVD",
  CD: "CD",
  
  // Non-fiction
  NF: "Non-Fiction",
  B: "Biography",
  
  // Graphic novels
  GN: "Graphic Novel",
  
  // Reference (may not be used, but common in libraries)
  REF: "Reference",
  R: "Reference",
};

/**
 * Dewey Decimal Classification main classes (hundreds)
 */
const DEWEY_CLASS_MAP: Record<number, string> = {
  0: "General Knowledge",
  1: "Philosophy & Psychology",
  2: "Religion",
  3: "Social Sciences",
  4: "Languages",
  5: "Science",
  6: "Technology",
  7: "Arts & Recreation",
  8: "Literature",
  9: "History & Geography",
};

/**
 * Expand a collection code to human-readable form
 * Returns null if the code is not recognized
 */
export function expandCollectionCode(code: string): string | null {
  const normalized = code.trim().toUpperCase();
  return COLLECTION_CODE_MAP[normalized] || null;
}

/**
 * Detect if a string is a Dewey Decimal number and expand it
 * Dewey numbers are 000-999 with optional decimal extensions
 * Returns null if not a valid Dewey number
 */
export function expandDeweyDecimal(deweyNum: string): string | null {
  // Try to parse as a number
  const num = parseFloat(deweyNum);
  
  // Check if it's a valid Dewey range (0-999.999...)
  if (isNaN(num) || num < 0 || num >= 1000) {
    return null;
  }
  
  // Get the hundreds digit (main class)
  const hundredsDigit = Math.floor(num / 100);
  
  return DEWEY_CLASS_MAP[hundredsDigit] || null;
}

/**
 * Build expanded call number with human-readable prefix
 * Format: [Description] [original call number parts]
 * 
 * Examples:
 * - J DON → "Juvenile Fiction J DON"
 * - 814.54 Johnson → "Literature 814.54 Johnson"
 * - JE Carle → "Juvenile Easy JE Carle"
 */
export function expandCallNumber(holding: HoldingsInfo): string {
  const parts: string[] = [];
  
  // Collect original call number components
  const originalParts: string[] = [];
  if (holding.callPrefix) {
    originalParts.push(holding.callPrefix);
  }
  if (holding.callClass) {
    originalParts.push(holding.callClass);
  }
  if (holding.callCutter) {
    originalParts.push(holding.callCutter);
  }
  
  // If no parts, return empty
  if (originalParts.length === 0) {
    return "";
  }
  
  // Try to find an expansion
  let expansion: string | null = null;
  
  // First, check if callClass is a Dewey number (prioritize Dewey over collection codes)
  if (holding.callClass) {
    const deweyExpansion = expandDeweyDecimal(holding.callClass);
    if (deweyExpansion) {
      expansion = deweyExpansion;
    }
  }
  
  // If not a Dewey number, try collection codes
  if (!expansion) {
    // Try to expand callPrefix if it exists
    if (holding.callPrefix) {
      expansion = expandCollectionCode(holding.callPrefix);
    }
    
    // If no expansion from prefix, try callClass as collection code
    if (!expansion && holding.callClass) {
      expansion = expandCollectionCode(holding.callClass);
    }
  }
  
  // Build final call number
  if (expansion) {
    parts.push(expansion);
  }
  
  parts.push(...originalParts);
  
  return parts.join(" ").trim();
}
