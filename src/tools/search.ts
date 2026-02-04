/**
 * search_catalog tool - Search the library catalog
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchCatalog, type SearchField } from "../lib/api.js";

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
  .describe("Field to search in. Defaults to 'any' which searches all fields.");

const SortSchema = z
  .enum(["relevancy", "title", "author", "date"])
  .default("relevancy")
  .describe("Sort order for results");

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

const sortMap: Record<string, "Relevancy" | "Title" | "Author" | "PublicationDate"> = {
  relevancy: "Relevancy",
  title: "Title",
  author: "Author",
  date: "PublicationDate",
};

export function registerSearchTool(server: McpServer): void {
  server.tool(
    "search_catalog",
    "Search the Handley Regional Library catalog for books, DVDs, and other materials. Returns matching items with title, author, format, and location information.",
    {
      query: z.string().describe("Search query text (e.g., book title, author name, subject)"),
      field: SearchFieldSchema,
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe("Maximum number of results to return (1-50)"),
      sort: SortSchema,
    },
    async ({ query, field, limit, sort }) => {
      try {
        const apiField = fieldMap[field] || "AnyField";
        const apiSort = sortMap[sort] || "Relevancy";

        const response = await searchCatalog(query, apiField, limit, 0, apiSort);

        if (response.totalHits === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No results found for "${query}" in ${field} field.`,
              },
            ],
          };
        }

        // Format results for readability
        const results = response.resources.map((resource) => {
          const holdings = resource.holdingsInformations.map((h) => ({
            branch: h.branchName,
            collection: h.collectionName,
            callNumber: [h.callPrefix, h.callClass, h.callCutter].filter(Boolean).join(" "),
            barcode: h.barcode,
          }));

          const isbns = resource.standardNumbers
            .filter((sn) => sn.type === "Isbn")
            .map((sn) => sn.data);

          return {
            resourceId: resource.id,
            title: resource.shortTitle,
            author: resource.shortAuthor,
            format: resource.format,
            publicationDate: resource.publicationDate?.publicationDate || null,
            isbn: isbns.length > 0 ? isbns[0] : null,
            holdings,
          };
        });

        const summary = `Found ${response.totalHits} result(s) for "${query}". Showing ${results.length}:`;

        return {
          content: [
            {
              type: "text" as const,
              text: summary + "\n\n" + JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching catalog: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
