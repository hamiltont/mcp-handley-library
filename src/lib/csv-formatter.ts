/**
 * CSV formatting utilities for library search results
 */

import type { Resource, HoldingsInfo, ItemAvailability } from "./api.js";

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
 * Build call number from its component pieces
 * Format: [prefix] class cutter
 */
export function buildCallNumber(holding: HoldingsInfo): string {
  const parts: string[] = [];
  
  if (holding.callPrefix) {
    parts.push(holding.callPrefix);
  }
  
  if (holding.callClass) {
    parts.push(holding.callClass);
  }
  
  if (holding.callCutter) {
    parts.push(holding.callCutter);
  }
  
  return parts.join(" ").trim();
}

/**
 * Build notes field for a holding
 * Returns empty string for standard physical books
 */
export function buildNotes(resource: Resource, holding: MergedHolding): string {
  const notes: string[] = [];
  
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
  
  // Add due date if checked out
  if (holding.availability?.available === false && holding.availability?.dueDate) {
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

/**
 * Transform aggregated meta objects to CSV format
 * Format: Title,Author,Call#,Branch,Status,Notes
 */
export function formatAsCSV(results: MergedResource[]): string {
  const lines: string[] = ["Title,Author,Call#,Branch,Status,Notes"];

  for (const resource of results) {
    for (const holding of resource.holdingsInformations) {
      const title = escapeCsvField(resource.shortTitle || "");
      const author = escapeCsvField(resource.shortAuthor || "");
      const callNumber = escapeCsvField(buildCallNumber(holding));
      const branch = escapeCsvField(holding.branchName || "");
      const status = getStatus(holding.availability);
      const notes = escapeCsvField(buildNotes(resource, holding));
      
      lines.push(`${title},${author},${callNumber},${branch},${status},${notes}`);
    }
  }

  return lines.join("\n");
}
