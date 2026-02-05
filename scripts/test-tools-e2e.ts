/**
 * Direct tool handler testing by importing the core logic
 * 
 * This demonstrates the BEST approach for E2E testing:
 * 1. Extract tool handler logic into separate exported functions
 * 2. Import and call them directly in tests
 * 3. No MCP protocol overhead, no background servers needed
 * 
 * Usage: npx tsx scripts/test-tools-extracted.ts
 */

import { searchAndMerge } from "../src/lib/book-finder.js";
import { formatAsCSV } from "../src/lib/csv-formatter.js";
import { deduplicateResults } from "../src/lib/deduplicator.js";

interface ToolTest {
  name: string;
  description: string;
  execute: () => Promise<string>;
  checks: Array<{
    name: string;
    check: (output: string) => boolean;
  }>;
}

const tests: ToolTest[] = [
  {
    name: "search_catalog (planning mode)",
    description: "Search for Julia Donaldson at Bowman - planning mode",
    execute: async () => {
      // Simulate search_catalog tool behavior
      const { resources, totalHits } = await searchAndMerge({
        query: "Julia Donaldson",
        apiField: "Author",
        limit: 20,
        branches: ["Bowman"],
        availableOnly: false,
      });
      
      if (totalHits === 0) {
        return `No results found`;
      }
      
      if (resources.length === 0) {
        return `Found ${totalHits} result(s) but none match filters`;
      }
      
      // Planning mode: merge call numbers, omit from CSV
      const deduplicated = deduplicateResults(resources, { mergeCallNumbers: true });
      return formatAsCSV(deduplicated, { includeCallNumbers: false });
    },
    checks: [
      {
        name: "Returns CSV format",
        check: (output) => output.includes("Title,Author,Branch,Status,Notes"),
      },
      {
        name: "Only includes Bowman branch",
        check: (output) => {
          const lines = output.split("\n").slice(1); // Skip header
          return lines.every(line => !line || line.includes("Bowman") || line.trim() === "");
        },
      },
      {
        name: "Omits call numbers (planning mode)",
        check: (output) => !output.includes("Call#"),
      },
      {
        name: "Has results",
        check: (output) => output.split("\n").length > 2,
      },
    ],
  },
  {
    name: "find_on_shelf (real-time mode)",
    description: "Find Julia Donaldson on shelf at Bowman - real-time mode",
    execute: async () => {
      // Simulate find_on_shelf tool behavior
      const { resources, totalHits } = await searchAndMerge({
        query: "Julia Donaldson",
        apiField: "Author",
        limit: 20,
        branches: ["Bowman"],
        availableOnly: true, // Real-time always filters to available
      });
      
      if (totalHits === 0) {
        return `No results found`;
      }
      
      if (resources.length === 0) {
        return `Found ${totalHits} result(s) but none are currently available`;
      }
      
      // Real-time mode: preserve call numbers, include in CSV
      const deduplicated = deduplicateResults(resources, { mergeCallNumbers: false });
      return formatAsCSV(deduplicated, { includeCallNumbers: true });
    },
    checks: [
      {
        name: "Returns CSV format",
        check: (output) => output.includes("Title,Author,Call#,Branch,Status,Notes"),
      },
      {
        name: "Includes call numbers (real-time mode)",
        check: (output) => output.includes("Call#"),
      },
      {
        name: "Only shows available items",
        check: (output) => {
          const lines = output.split("\n").slice(1);
          return lines.every(line => !line || line.includes("Available") || line.trim() === "");
        },
      },
    ],
  },
  {
    name: "search_catalog with Clarke",
    description: "Branch filter test with Clarke (smaller branch)",
    execute: async () => {
      const { resources, totalHits } = await searchAndMerge({
        query: "Julia Donaldson",
        apiField: "Author",
        limit: 20,
        branches: ["Clarke"],
        availableOnly: false,
      });
      
      if (totalHits === 0) {
        return `No results found`;
      }
      
      if (resources.length === 0) {
        return `Found ${totalHits} result(s) but none match filters`;
      }
      
      const deduplicated = deduplicateResults(resources, { mergeCallNumbers: true });
      return formatAsCSV(deduplicated, { includeCallNumbers: false });
    },
    checks: [
      {
        name: "Returns Clarke results (not empty)",
        check: (output) => output.includes("Clarke") && !output.includes("No results"),
      },
      {
        name: "Branch filtering works (only Clarke)",
        check: (output) => {
          const lines = output.split("\n").slice(1);
          return lines.every(line => !line || line.includes("Clarke") || line.trim() === "");
        },
      },
    ],
  },
];

async function runTest(test: ToolTest): Promise<boolean> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`TEST: ${test.description}`);
  console.log(`${"=".repeat(70)}\n`);
  
  try {
    const output = await test.execute();
    
    console.log("Output:");
    const lines = output.split("\n");
    if (lines.length > 20) {
      console.log(lines.slice(0, 10).join("\n"));
      console.log(`... (${lines.length - 13} more lines) ...`);
      console.log(lines.slice(-3).join("\n"));
    } else {
      console.log(output);
    }
    
    console.log("\nSanity Checks:");
    let allPassed = true;
    for (const check of test.checks) {
      try {
        const passed = check.check(output);
        console.log(passed ? `✓ ${check.name}` : `✗ ${check.name}`);
        if (!passed) allPassed = false;
      } catch (error) {
        console.log(`✗ ${check.name} (error: ${error})`);
        allPassed = false;
      }
    }
    
    return allPassed;
  } catch (error) {
    console.log("❌ TEST FAILED:", error);
    return false;
  }
}

async function main() {
  console.log("🧪 Direct Tool Handler Testing");
  console.log("Testing by calling extracted handler logic directly\n");
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const success = await runTest(test);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log(`\n${"=".repeat(70)}`);
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`${"=".repeat(70)}`);
  
  if (passed > 0) {
    console.log("\n✅ This approach works! Tool handlers can be tested directly.");
    console.log("   No MCP protocol overhead, no background servers needed.");
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
