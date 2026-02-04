/**
 * get_book_details tool - Get detailed bibliographic information
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getResourceDetails } from "../lib/api.js";

export function registerDetailsTool(server: McpServer): void {
  server.tool(
    "get_book_details",
    "Get detailed bibliographic information for a specific resource, including full title, authors, subjects, summary, ISBN, and more.",
    {
      resourceId: z
        .number()
        .int()
        .positive()
        .describe("The unique resource ID (obtained from search_catalog results)"),
    },
    async ({ resourceId }) => {
      try {
        const details = await getResourceDetails(resourceId);

        if (!details || details.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No details found for resource ID ${resourceId}.`,
              },
            ],
          };
        }

        // Convert array of fields to a more readable object
        const formatted: Record<string, string | string[]> = {};

        for (const field of details) {
          const values = field.detailsValues.map((v) => v.value);
          if (values.length === 1) {
            formatted[field.label] = values[0];
          } else if (values.length > 1) {
            formatted[field.label] = values;
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `Details for resource ${resourceId}:\n\n` + JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching details: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
