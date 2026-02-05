/**
 * search_catalog tool - Planning mode for holds and availability checking
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SearchField } from "../lib/api.js";
import { searchAndMerge } from "../lib/book-finder.js";
import { formatAsCSV } from "../lib/csv-formatter.js";
import { deduplicateResults } from "../lib/deduplicator.js";

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
  .array(z.enum(["Bowman", "Handley", "Clarke"]))
  .optional()
  .describe("Filter to specific branches");

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

export function registerSearchCatalogTool(server: McpServer): void {
  server.tool(
    "search_catalog",
    "Plan holds by checking availability across Handley Regional Library branches",
    {
      query: z.string().describe("Search query"),
      field: SearchFieldSchema,
      branch: BranchSchema,
      available_only: z
        .boolean()
        .default(false)
        .describe("Only return currently available items"),
    },
    async ({ query, field, branch, available_only }) => {
      try {
        const apiField = fieldMap[field] || "AnyField";
        const limit = 20;

        // Use shared search and merge logic
        const { resources, totalHits } = await searchAndMerge({
          query,
          apiField,
          limit,
          branches: branch,
          availableOnly: available_only,
        });

        if (totalHits === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No results found for "${query}"`,
              },
            ],
          };
        }

        if (resources.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Found ${totalHits} result(s) but none match filters`,
              },
            ],
          };
        }

        // Planning mode: merge across call numbers (user doesn't care about section)
        const deduplicatedResults = deduplicateResults(resources, { mergeCallNumbers: true });

        // Planning mode: omit call numbers, keep branch and status
        const csvOutput = formatAsCSV(deduplicatedResults, { 
          includeCallNumbers: false,
          includeBranch: true,
          includeStatus: true,
        });

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
