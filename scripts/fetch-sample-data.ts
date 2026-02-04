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

  // Test 1: Search for Julia Donaldson books (Juvenile)
  console.log("1. Searching for 'Julia Donaldson' books (Juvenile)...");
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

  // Test 3: Search for parenting books (mixed formats)
  console.log("3. Searching for 'parenting' (mixed formats)...");
  const search3 = await searchCatalog("parenting", "AnyField", 5, 0, "Relevancy");
  writeFileSync(
    "test/samples/search-parenting.json",
    JSON.stringify(search3, null, 2)
  );
  console.log(`   Found ${search3.totalHits} results`);

  // Test 4: Search for adult fiction
  console.log("4. Searching for 'Anna Quindlen' (adult fiction)...");
  const search4 = await searchCatalog("Anna Quindlen", "Author", 5, 0, "Relevancy");
  writeFileSync(
    "test/samples/search-adult-fiction.json",
    JSON.stringify(search4, null, 2)
  );
  console.log(`   Found ${search4.totalHits} results`);

  // Test 5: Search for non-fiction with Dewey Decimal
  console.log("5. Searching for 'dinosaurs' (likely science/non-fiction)...");
  const search5 = await searchCatalog("dinosaurs", "Subject", 5, 0, "Relevancy");
  writeFileSync(
    "test/samples/search-dinosaurs-nonfiction.json",
    JSON.stringify(search5, null, 2)
  );
  console.log(`   Found ${search5.totalHits} results`);

  // Test 6: Search for biography
  console.log("6. Searching for 'biography' (biography section)...");
  const search6 = await searchCatalog("biography", "AnyField", 5, 0, "Relevancy");
  writeFileSync(
    "test/samples/search-biography.json",
    JSON.stringify(search6, null, 2)
  );
  console.log(`   Found ${search6.totalHits} results`);

  // Test 7: Search for young adult
  console.log("7. Searching for 'Twilight Meyer' (young adult)...");
  const search7 = await searchCatalog("Twilight Meyer", "AnyField", 5, 0, "Relevancy");
  writeFileSync(
    "test/samples/search-young-adult.json",
    JSON.stringify(search7, null, 2)
  );
  console.log(`   Found ${search7.totalHits} results`);

  // Test 8: Get availability for first search
  if (search1.resources.length > 0) {
    console.log("8. Checking availability for Julia Donaldson books...");
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
  console.log("   Use these files to understand API response structures across different collection types");
}

main().catch((error) => {
  console.error("Error fetching sample data:", error);
  process.exit(1);
});
