/**
 * find_on_shelf tool - Real-time mode for locating items on shelves
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
      query: z.string().describe("Search query"),
      field: SearchFieldSchema,
      branch: BranchSchema,
    },
    async ({ query, field, branch }) => {
      try {
        const apiField = fieldMap[field] || "AnyField";
        const limit = 20;

        // Real-time mode: always filter to available only, single branch
        const { resources, totalHits } = await searchAndMerge({
          query,
          apiField,
          limit,
          branches: [branch],
          availableOnly: true, // Always true for real-time
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
                text: `Found ${totalHits} result(s) at ${branch} but none are currently available`,
              },
            ],
          };
        }

        // Real-time mode: preserve different call numbers (different shelf locations matter)
        const deduplicatedResults = deduplicateResults(resources, { mergeCallNumbers: false });

        // Real-time mode: include call numbers for shelf navigation
        const csvOutput = formatAsCSV(deduplicatedResults, { includeCallNumbers: true });

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
