/**
 * Core search and merge logic for catalog tools
 * Extracted for testability and DRY across search_catalog and find_on_shelf
 */

import { checkAvailability, searchCatalog, type SearchField } from "./api.js";
import type { MergedResource } from "./csv-formatter.js";

export interface SearchAndMergeOptions {
  query: string;
  apiField: SearchField;
  limit: number;
  branches?: string[];
  availableOnly?: boolean;
}

export interface SearchAndMergeResult {
  resources: MergedResource[];
  totalHits: number;
}

/**
 * Core search flow: search catalog + check availability + merge data
 * Returns aggregated meta objects ready for deduplication and formatting
 */
export async function searchAndMerge(
  options: SearchAndMergeOptions
): Promise<SearchAndMergeResult> {
  const { query, apiField, limit, branches, availableOnly } = options;

  // Step 1: Search catalog
  const searchResponse = await searchCatalog(query, apiField, limit, 0, "Relevancy");

  if (searchResponse.totalHits === 0) {
    return { resources: [], totalHits: 0 };
  }

  // Step 2: Collect all barcodes for availability check
  const availabilityItems = searchResponse.resources.flatMap((resource) =>
    resource.holdingsInformations.map((holding) => ({
      itemIdentifier: holding.barcode,
      resourceId: resource.id,
    }))
  );

  // Step 3: Check availability for all items
  const availabilityResponse = await checkAvailability(availabilityItems);

  // Step 4: Create availability lookup map by barcode
  const availabilityMap = new Map(
    availabilityResponse.itemAvailabilities.map((item) => [item.itemIdentifier, item])
  );

  // Step 5: Aggregate all data - merge search results with availability data
  const mergedResources: MergedResource[] = searchResponse.resources.map((resource) => {
    // Merge holdings with availability data (keep ALL fields from both)
    const holdingsWithAvailability = resource.holdingsInformations.map((holding) => {
      const availability = availabilityMap.get(holding.barcode);
      return {
        // All holding fields from search API
        ...holding,
        // All availability fields from availability API
        availability: availability || null,
      };
    });

    return {
      // All resource fields from search API
      ...resource,
      // Replace holdings with merged version
      holdingsInformations: holdingsWithAvailability,
    } as MergedResource;
  });

  // Step 6: Apply filters
  let filteredResources = mergedResources;

  if (branches && branches.length > 0) {
    filteredResources = applyBranchFilter(filteredResources, branches);
  }

  if (availableOnly) {
    filteredResources = applyAvailabilityFilter(filteredResources);
  }

  return {
    resources: filteredResources,
    totalHits: searchResponse.totalHits,
  };
}

/**
 * Filter resources to only include holdings at specified branches
 * Removes resources entirely if no holdings match
 */
export function applyBranchFilter(
  resources: MergedResource[],
  branches: string[]
): MergedResource[] {
  return resources
    .map((resource) => {
      const filteredHoldings = resource.holdingsInformations.filter((h) =>
        branches.includes(h.branchName)
      );

      if (filteredHoldings.length === 0) {
        return null;
      }

      return {
        ...resource,
        holdingsInformations: filteredHoldings,
      };
    })
    .filter((r): r is MergedResource => r !== null);
}

/**
 * Filter resources to only include those with at least one available copy
 * Keeps all holdings but removes entire resource if none are available
 */
export function applyAvailabilityFilter(resources: MergedResource[]): MergedResource[] {
  return resources.filter((resource) => {
    const hasAvailableCopy = resource.holdingsInformations.some(
      (h) => h.availability?.available === true
    );
    return hasAvailableCopy;
  });
}
