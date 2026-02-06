/**
 * Deduplication logic for library search results
 * 
 * Handles two cases:
 * 1. Multiple copies of same book at same branch → single row with quantity
 * 2. Same book at multiple branches → single row with "Multiple" branch and details in Notes
 */

import type { MergedResource, MergedHolding } from "./csv-formatter.js";
import { buildCallNumber } from "./csv-formatter.js";

/**
 * Unique identifier for a book holding (ignoring status/availability)
 */
interface HoldingKey {
  title: string;
  author: string;
  callNumber: string;
  branch: string;
}

/**
 * Generate a unique key for a holding
 */
function getHoldingKey(resource: MergedResource, holding: MergedHolding): HoldingKey {
  return {
    title: resource.shortTitle || "",
    author: resource.shortAuthor || "",
    callNumber: buildCallNumber(holding),
    branch: holding.branchName || "",
  };
}

/**
 * Convert HoldingKey to string for Map usage
 * Normalizes to lowercase for case-insensitive comparison
 */
function keyToString(key: HoldingKey): string {
  return `${key.title.toLowerCase()}|||${key.author.toLowerCase()}|||${key.callNumber.toLowerCase()}|||${key.branch.toLowerCase()}`;
}

/**
 * Convert HoldingKey to string WITHOUT branch for cross-branch grouping
 * Normalizes to lowercase for case-insensitive comparison
 * @param includeCallNumber - If true, include call number in key (real-time mode)
 */
function keyToStringWithoutBranch(key: HoldingKey, includeCallNumber: boolean = true): string {
  if (includeCallNumber) {
    return `${key.title.toLowerCase()}|||${key.author.toLowerCase()}|||${key.callNumber.toLowerCase()}`;
  }
  return `${key.title.toLowerCase()}|||${key.author.toLowerCase()}`;
}

/**
 * Group holdings by branch and count availability
 */
interface BranchCounts {
  branchName: string;
  totalCopies: number;
  availableCopies: number;
  holdings: MergedHolding[];
}

export interface DeduplicationOptions {
  /**
   * Whether to merge holdings with different call numbers
   * - true (planning mode): Merge across call numbers - user doesn't care about section
   * - false (real-time mode): Preserve different call numbers - different shelf locations matter
   */
  mergeCallNumbers?: boolean;
}

/**
 * Deduplicate results by merging duplicate holdings
 * 
 * Strategy:
 * 1. Group holdings by (title, author, [callNumber], branch)
 * 2. For same branch with multiple copies: merge into single holding with quantity notes
 * 3. For multiple branches (planning mode): create "Multiple" branch entry with branch details in notes
 * 
 * @param results - Resources to deduplicate
 * @param options - Deduplication options (mergeCallNumbers defaults to true for backward compatibility)
 */
export function deduplicateResults(
  results: MergedResource[],
  options: DeduplicationOptions = {}
): MergedResource[] {
  const { mergeCallNumbers = true } = options;
  // First pass: flatten all holdings and group by book (without branch)
  const bookGroups = new Map<string, Map<string, BranchCounts>>();
  
  for (const resource of results) {
    for (const holding of resource.holdingsInformations) {
      const key = getHoldingKey(resource, holding);
      // In real-time mode (!mergeCallNumbers), include call number in grouping key
      // In planning mode (mergeCallNumbers), exclude call number to merge across sections
      const bookKey = keyToStringWithoutBranch(key, !mergeCallNumbers);
      // Normalize branch for case-insensitive grouping
      const branchKey = key.branch.toLowerCase();

      if (!bookGroups.has(bookKey)) {
        bookGroups.set(bookKey, new Map());
      }

      const branches = bookGroups.get(bookKey)!;

      if (!branches.has(branchKey)) {
        branches.set(branchKey, {
          branchName: key.branch, // Preserve original capitalization (first encountered)
          totalCopies: 0,
          availableCopies: 0,
          holdings: [],
        });
      }

      const branchCounts = branches.get(branchKey)!;
      branchCounts.totalCopies++;
      if (holding.availability?.available) {
        branchCounts.availableCopies++;
      }
      branchCounts.holdings.push(holding);
    }
  }
  
  // Second pass: rebuild deduplicated resources
  const deduplicatedResults: MergedResource[] = [];
  const processedBooks = new Set<string>();
  
  for (const resource of results) {
    for (const holding of resource.holdingsInformations) {
      const key = getHoldingKey(resource, holding);
      const bookKey = keyToStringWithoutBranch(key, !mergeCallNumbers);
      
      // Skip if we've already processed this book
      if (processedBooks.has(bookKey)) {
        continue;
      }
      processedBooks.add(bookKey);
      
      const branches = bookGroups.get(bookKey)!;
      const branchesArray = Array.from(branches.values());
      
      // Case 1: Single branch with potentially multiple copies
      if (branchesArray.length === 1) {
        const branchCounts = branchesArray[0];
        
        // Pick the best holding to represent this group (prefer Available)
        const bestHolding = branchCounts.holdings.find(h => h.availability?.available) || branchCounts.holdings[0];
        
        // Create new resource with single deduplicated holding
        const newHolding: any = {
          ...bestHolding,
        };
        
        // Add quantity notes only if multiple copies
        if (branchCounts.totalCopies > 1) {
          if (branchCounts.availableCopies > 0) {
            newHolding._quantityNotes = `${branchCounts.totalCopies} copies (${branchCounts.availableCopies} available)`;
          } else {
            newHolding._quantityNotes = `${branchCounts.totalCopies} copies (all checked out)`;
          }
        }
        
        const deduplicatedResource: MergedResource = {
          ...resource,
          holdingsInformations: [newHolding],
        };
        
        deduplicatedResults.push(deduplicatedResource);
        
      } else {
        // Case 2: Multiple branches - create "Multiple" entry
        
        // Determine overall status: Available if ANY branch has available copies
        const hasAvailable = branchesArray.some(b => b.availableCopies > 0);
        
        // Pick one holding as the template (prefer one with availability)
        const templateBranch = branchesArray.find(b => b.availableCopies > 0) || branchesArray[0];
        const templateHolding = templateBranch.holdings.find(h => h.availability?.available) || templateBranch.holdings[0];
        
        // Build branch details for notes
        const branchDetails = branchesArray
          .map(b => {
            if (b.availableCopies > 0) {
              return `${b.totalCopies} at ${b.branchName} (${b.availableCopies} available)`;
            } else {
              return `${b.totalCopies} at ${b.branchName}`;
            }
          })
          .join(", ");
        
        // Create new resource with "Multiple" branch
        const deduplicatedResource: MergedResource = {
          ...resource,
          holdingsInformations: [{
            ...templateHolding,
            branchName: "Multiple",
            availability: {
              ...templateHolding.availability!,
              available: hasAvailable,
            },
            _branchDetails: branchDetails,
          } as any],
        };
        
        deduplicatedResults.push(deduplicatedResource);
      }
    }
  }
  
  return deduplicatedResults;
}
