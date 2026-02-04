/**
 * check_availability tool - Check real-time availability of items
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { checkAvailability } from "../lib/api.js";

const ItemSchema = z.object({
  barcode: z.string().describe("Item barcode (itemIdentifier)"),
  resourceId: z.number().int().describe("Resource ID the item belongs to"),
});

export function registerAvailabilityTool(server: McpServer): void {
  server.tool(
    "check_availability",
    "Check real-time circulation status for specific library items. Returns whether each item is available, checked out, or has other status.",
    {
      items: z
        .array(ItemSchema)
        .min(1)
        .max(20)
        .describe("Array of items to check (barcode + resourceId pairs)"),
    },
    async ({ items }) => {
      try {
        const apiItems = items.map((item) => ({
          itemIdentifier: item.barcode,
          resourceId: item.resourceId,
        }));

        const response = await checkAvailability(apiItems);

        if (!response.hostSystemDiag.methodSupported) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Availability checking is not currently supported by the library system.",
              },
            ],
            isError: true,
          };
        }

        if (response.hostSystemDiag.hostSystemFailure) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Library system error: ${response.hostSystemDiag.hostSystemFailure}`,
              },
            ],
            isError: true,
          };
        }

        // Format results
        const results = response.itemAvailabilities.map((item) => ({
          barcode: item.itemIdentifier,
          resourceId: item.resourceId,
          available: item.available,
          status: item.status,
          dueDate: item.dueDateString || item.dueDate || null,
          nonCirculating: item.nonCirculating,
          onOrder: item.onOrder,
        }));

        const availableCount = results.filter((r) => r.available).length;
        const summary = `Checked ${results.length} item(s): ${availableCount} available, ${results.length - availableCount} unavailable.`;

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
              text: `Error checking availability: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
