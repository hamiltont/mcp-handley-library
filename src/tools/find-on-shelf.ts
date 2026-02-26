/**
 * find_on_shelf tool - Real-time mode for locating items on shelves
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SearchField } from "../lib/api.js";
import { searchAndMerge } from "../lib/book-finder.js";
import { formatAsCSV, type MergedResource } from "../lib/csv-formatter.js";
import { deduplicateResults } from "../lib/deduplicator.js";
import { MAX_TOTAL_RESULTS } from "../lib/config.js";

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
  .enum(["Bowman", "Handley", "Clarke"])
  .describe("Branch you are currently at");

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

export function registerFindOnShelfTool(server: McpServer): void {
  server.tool(
    "find_on_shelf",
    "Locate immediately available items at your current location (branch)",
    {
      query: z
        .union([z.string(), z.array(z.string()).max(20)])
        .describe(
          "Search query or array of queries (max 20). Pass single query for comprehensive results, or multiple queries for quick comparison (automatically limited per query)."
        ),
      field: SearchFieldSchema,
      branch: BranchSchema,
    },
    async ({ query, field, branch }) => {
      try {
        const apiField = fieldMap[field] || "AnyField";

        // Handle single vs multiple queries
        const queries = Array.isArray(query) ? query : [query];
        const queryCount = queries.length;

        // Dynamic limit: divide MAX_TOTAL_RESULTS by query count, minimum 2 per query
        const limitPerQuery = Math.max(2, Math.floor(MAX_TOTAL_RESULTS / queryCount));

        // Execute all queries in parallel
        // Real-time mode: always filter to available only, single branch
        const searchPromises = queries.map((q) =>
          searchAndMerge({
            query: q,
            apiField,
            limit: limitPerQuery,
            branches: [branch],
            availableOnly: true, // Always true for real-time
          }).catch((error) => {
            // Return error marker instead of throwing - enables partial results
            return {
              resources: [],
              totalHits: 0,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          })
        );

        const results = await Promise.all(searchPromises);

        // Merge all resources and sum totalHits
        const allResources: MergedResource[] = [];
        let totalHits = 0;
        let failedQueries = 0;

        for (const result of results) {
          if ("error" in result) {
            failedQueries++;
          } else {
            allResources.push(...result.resources);
            totalHits += result.totalHits;
          }
        }

        if (totalHits === 0 && failedQueries === 0) {
          const queryText = Array.isArray(query) ? `${query.length} queries` : `"${query}"`;
          return {
            content: [
              {
                type: "text" as const,
                text: `No results found for ${queryText}`,
              },
            ],
          };
        }

        if (allResources.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Found ${totalHits} result(s) at ${branch} but none are currently available${
                  failedQueries > 0 ? `. Note: ${failedQueries} queries failed` : ""
                }`,
              },
            ],
          };
        }

        // Real-time mode: preserve different call numbers (different shelf locations matter)
        // Deduplication also merges books that appear in multiple queries
        const deduplicatedResults = deduplicateResults(allResources, {
          mergeCallNumbers: false,
        });

        // Real-time mode: include call numbers, omit branch (redundant) and status (always available)
        const csvOutput = formatAsCSV(deduplicatedResults, {
          includeCallNumbers: true,
          includeBranch: false,
          includeStatus: false,
        });

        // Add error note if some queries failed
        const finalOutput =
          failedQueries > 0
            ? `${csvOutput}\n\nNote: ${failedQueries} ${
                failedQueries === 1 ? "query" : "queries"
              } failed`
            : csvOutput;

        return {
          content: [
            {
              type: "text" as const,
              text: finalOutput,
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
