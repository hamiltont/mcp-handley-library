/**
 * CSV formatting utilities for library search results
 */

import type { HoldingsInfo, ItemAvailability, Resource } from "./api.js";
import { expandCallNumber } from "./call-number-expander.js";

/**
 * Merged resource with availability data
 */
export interface MergedHolding extends HoldingsInfo {
  availability: ItemAvailability | null;
}

export interface MergedResource extends Resource {
  holdingsInformations: MergedHolding[];
}

/**
 * Build call number from its component pieces with human-readable expansion
 * Format: [Description] [prefix] class cutter
 * 
 * Examples:
 * - J DON → "Juvenile Fiction J DON"
 * - 814.54 Johnson → "Literature 814.54 Johnson"
 * - JE Carle → "Juvenile Easy JE Carle"
 */
export function buildCallNumber(holding: HoldingsInfo): string {
  return expandCallNumber(holding);
}

/**
 * Build notes field for a holding
 * Returns empty string for standard physical books
 */
export function buildNotes(resource: Resource, holding: MergedHolding): string {
  const notes: string[] = [];
  
  // Add branch details if this is a multi-branch deduplicated entry
  const branchDetails = (holding as any)._branchDetails;
  if (branchDetails) {
    notes.push(branchDetails);
  }
  
  // Add quantity notes if this is a deduplicated entry with multiple copies
  const quantityNotes = (holding as any)._quantityNotes;
  if (quantityNotes) {
    notes.push(quantityNotes);
  }
  
  // Add media type if not a standard book
  const format = resource.format?.toLowerCase() || "";
  if (format.includes("audiobook") || format.includes("audio book")) {
    notes.push("Audiobook");
  } else if (format.includes("ebook") || format.includes("e-book")) {
    notes.push("eBook");
  } else if (format.includes("dvd") || format.includes("video")) {
    notes.push("DVD");
  } else if (format.includes("cd") && !format.includes("audiobook")) {
    notes.push("CD");
  }
  
  // Add due date if checked out (skip if we have quantity notes, as it's confusing)
  if (!quantityNotes && !branchDetails && holding.availability?.available === false && holding.availability?.dueDate) {
    notes.push(`Due: ${holding.availability.dueDate}`);
  }
  
  return notes.join(" | ");
}

/**
 * Get readable status from availability data
 */
export function getStatus(availability: ItemAvailability | null): string {
  if (!availability) {
    return "Unknown";
  }
  
  if (availability.available) {
    return "Available";
  } else {
    return "Checked Out";
  }
}

/**
 * Escape CSV field: wrap in quotes if contains comma, quote, or newline
 */
export function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export interface FormatOptions {
  /**
   * Whether to include Call# column in CSV output
   * - true (real-time mode): Include call numbers for shelf navigation
   * - false (planning mode): Omit call numbers to save tokens (~30-40% reduction)
   */
  includeCallNumbers?: boolean;
  /**
   * Whether to include Branch column in CSV output
   * - true (planning mode): Include branch to know which location has the book
   * - false (real-time mode): Omit branch since user already specified it (redundant)
   */
  includeBranch?: boolean;
  /**
   * Whether to include Status column in CSV output
   * - true (planning mode): Include status to distinguish available vs needs hold
   * - false (real-time mode): Omit status when it's always constant (availableOnly=true)
   */
  includeStatus?: boolean;
}

/**
 * Transform aggregated meta objects to CSV format
 * 
 * Planning mode format: Title,Author,Branch,Status,Notes
 * Real-time mode format: Title,Author,Call#,Notes
 * 
 * @param results - Resources to format
 * @param options - Format options (all default to true for backward compatibility)
 */
export function formatAsCSV(results: MergedResource[], options: FormatOptions = {}): string {
  const { 
    includeCallNumbers = true,
    includeBranch = true,
    includeStatus = true,
  } = options;
  
  // Build header based on options
  const headerFields: string[] = ["Title", "Author"];
  if (includeCallNumbers) headerFields.push("Call#");
  if (includeBranch) headerFields.push("Branch");
  if (includeStatus) headerFields.push("Status");
  headerFields.push("Notes");
  const header = headerFields.join(",");
  
  const lines: string[] = [header];

  for (const resource of results) {
    for (const holding of resource.holdingsInformations) {
      const title = escapeCsvField(resource.shortTitle || "");
      const author = escapeCsvField(resource.shortAuthor || "");
      const callNumber = escapeCsvField(buildCallNumber(holding));
      const branch = escapeCsvField(holding.branchName || "");
      const status = getStatus(holding.availability);
      const notes = escapeCsvField(buildNotes(resource, holding));
      
      // Build row based on options
      const rowFields: string[] = [title, author];
      if (includeCallNumbers) rowFields.push(callNumber);
      if (includeBranch) rowFields.push(branch);
      if (includeStatus) rowFields.push(status);
      rowFields.push(notes);
      
      lines.push(rowFields.join(","));
    }
  }

  return lines.join("\n");
}
