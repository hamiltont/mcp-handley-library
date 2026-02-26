/**
 * Configuration management for the MCP server
 * Handles environment variables and defaults
 */

/**
 * Maximum total results to return across all queries
 * Default: 40 results
 *
 * For single queries: full limit is used
 * For bulk queries: limit is divided by query count (min 2 per query)
 */
export const MAX_TOTAL_RESULTS = parseInt(
  process.env.MAX_TOTAL_RESULTS || "40",
  10
);
