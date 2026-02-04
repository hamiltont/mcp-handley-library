/**
 * Script to fetch sample data from the library API for testing
 * Usage: tsx scripts/fetch-sample-data.ts
 */

import { writeFileSync, mkdirSync } from "fs";
import { searchCatalog, checkAvailability } from "../src/lib/api.js";

async function main() {
  console.log("Fetching sample data from library API...\n");

  // Create samples directory
  mkdirSync("test/samples", { recursive: true });

  // Test 1: Search for Julia Donaldson books
  console.log("1. Searching for 'Julia Donaldson' books...");
  const search1 = await searchCatalog("Julia Donaldson", "Author", 5, 0, "Relevancy");
  writeFileSync(
    "test/samples/search-julia-donaldson.json",
    JSON.stringify(search1, null, 2)
  );
  console.log(`   Found ${search1.totalHits} results, saved first 5`);

  // Test 2: Search for a specific title
  console.log("2. Searching for 'Room on the Broom'...");
  const search2 = await searchCatalog("Room on the Broom", "Title", 5, 0, "Relevancy");
  writeFileSync(
    "test/samples/search-room-on-broom.json",
    JSON.stringify(search2, null, 2)
  );
  console.log(`   Found ${search2.totalHits} results`);

  // Test 3: Search for books (likely mixed formats)
  console.log("3. Searching for 'parenting'...");
  const search3 = await searchCatalog("parenting", "AnyField", 5, 0, "Relevancy");
  writeFileSync(
    "test/samples/search-parenting.json",
    JSON.stringify(search3, null, 2)
  );
  console.log(`   Found ${search3.totalHits} results`);

  // Test 4: Get availability for first search
  if (search1.resources.length > 0) {
    console.log("4. Checking availability for Julia Donaldson books...");
    const availabilityItems = search1.resources.flatMap((resource) =>
      resource.holdingsInformations.map((holding) => ({
        itemIdentifier: holding.barcode,
        resourceId: resource.id,
      }))
    );
    
    const availability = await checkAvailability(availabilityItems);
    writeFileSync(
      "test/samples/availability-julia-donaldson.json",
      JSON.stringify(availability, null, 2)
    );
    console.log(`   Checked ${availability.itemAvailabilities.length} items`);
  }

  console.log("\n✅ Sample data saved to test/samples/");
  console.log("   Use these files to understand the API response structure");
}

main().catch((error) => {
  console.error("Error fetching sample data:", error);
  process.exit(1);
});
