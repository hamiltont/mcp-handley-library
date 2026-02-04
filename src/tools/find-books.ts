/**
 * find_books tool - Consolidated search and availability check
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchCatalog, checkAvailability, type SearchField } from "../lib/api.js";
import { formatAsCSV, type MergedResource } from "../lib/csv-formatter.js";

const SearchFieldSchema = z
  .enum([
    "any",
    "title",
    "author",
    "series",
    "subject",
    "note",
    "tag",
    "isbn",
    "upc",
    "callnumber",
  ])
  .default("any")
  .describe("Field to search in");

const BranchSchema = z
  .array(z.enum(["Bowman", "Handley", "Clarke County"]))
  .optional()
  .describe("Filter results to specific branches");

// Map user-friendly field names to API field names
const fieldMap: Record<string, SearchField> = {
  any: "AnyField",
  title: "Title",
  author: "Author",
  series: "Series",
  subject: "Subject",
  note: "Note",
  tag: "Tag",
  isbn: "ISBN",
  upc: "UPC",
  callnumber: "CallNumber",
};

export function registerFindBooksTool(server: McpServer): void {
  server.tool(
    "find_books",
    "Search the Handley Regional Library catalog",
    {
      query: z.string().describe("Search query"),
      field: SearchFieldSchema,
      branch: BranchSchema,
      available_only: z
        .boolean()
        .default(false)
        .describe("Only return books that are currently available"),
    },
    async ({ query, field, branch, available_only }) => {
      try {
        const apiField = fieldMap[field] || "AnyField";
        const limit = 20; // Fixed limit

        // Step 1: Search catalog
        const searchResponse = await searchCatalog(query, apiField, limit, 0, "Relevancy");

        if (searchResponse.totalHits === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No results found for "${query}"`,
              },
            ],
          };
        }

        // Step 2: Collect all barcodes for availability check
        const availabilityItems = searchResponse.resources.flatMap((resource) =>
          resource.holdingsInformations.map((holding) => ({
            itemIdentifier: holding.barcode,
            resourceId: resource.id,
          }))
        );

        // Step 3: Check availability for all items
        let availabilityResponse;
        try {
          availabilityResponse = await checkAvailability(availabilityItems);
        } catch (error) {
          // If availability check fails, continue with search results but note the error
          const message = error instanceof Error ? error.message : "Unknown error";
          return {
            content: [
              {
                type: "text" as const,
                text: `Search succeeded but availability check failed: ${message}`,
              },
            ],
            isError: true,
          };
        }

        // Step 4: Create availability lookup map by barcode
        const availabilityMap = new Map(
          availabilityResponse.itemAvailabilities.map((item) => [
            item.itemIdentifier,
            item,
          ])
        );

        // Step 5: Aggregate all data - merge search results with availability data
        const results: MergedResource[] = searchResponse.resources
          .map((resource) => {
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

            // Apply branch filter if specified
            let filteredHoldings = holdingsWithAvailability;
            if (branch && branch.length > 0) {
              filteredHoldings = holdingsWithAvailability.filter((h) =>
                branch.includes(h.branchName as any)
              );
            }

            // Skip this resource if no holdings match the branch filter
            if (filteredHoldings.length === 0) {
              return null;
            }

            // Apply availability filter if specified
            if (available_only) {
              const hasAvailableCopy = filteredHoldings.some(
                (h) => h.availability?.available === true
              );
              if (!hasAvailableCopy) {
                return null;
              }
            }

            // Return full resource with merged holdings
            return {
              // All resource fields from search API
              ...resource,
              // Replace holdings with merged version
              holdingsInformations: filteredHoldings,
            };
          })
          .filter((result) => result !== null);

        if (results.length === 0) {
          let message = `Found ${searchResponse.totalHits} result(s) but none match filters`;
          return {
            content: [
              {
                type: "text" as const,
                text: message,
              },
            ],
          };
        }

        // Transform aggregated meta object to CSV format
        const csvOutput = formatAsCSV(results);

        return {
          content: [
            {
              type: "text" as const,
              text: csvOutput,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
