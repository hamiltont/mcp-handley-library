/**
 * Test CSV format with flexible "notes" column
 */

const sampleBooks = [
  {
    title: "Room on the Broom",
    author: "Julia Donaldson",
    callNumber: "J DON",
    branch: "Bowman",
    status: "Available",
    notes: "" // Standard case - no notes needed
  },
  {
    title: "The Gruffalo",
    author: "Julia Donaldson",
    callNumber: "J DON",
    branch: "Bowman",
    status: "Checked Out",
    notes: ""
  },
  {
    title: "Goodnight Moon",
    author: "Margaret Wise Brown",
    callNumber: "J BRO",
    branch: "Handley",
    status: "Available",
    notes: "Large print"
  },
  {
    title: "Where the Wild Things Are",
    author: "Maurice Sendak",
    callNumber: "AB SEN",
    branch: "Digital",
    status: "Available",
    notes: "Audiobook"
  },
  {
    title: "Owl Babies",
    author: "Martin Waddell",
    callNumber: "J WAD",
    branch: "Bowman",
    status: "Available",
    notes: "On hold for you"
  }
];

function formatAsCSVWithNotes(books: typeof sampleBooks): string {
  const header = "Title,Author,Call#,Branch,Status,Notes";
  const rows = books.map(b => {
    const notes = b.notes || "";
    return `${b.title},${b.author},${b.callNumber},${b.branch},${b.status},${notes}`;
  });
  return [header, ...rows].join("\n");
}

function estimateTokens(text: string): number {
  const words = text.split(/\s+/).length;
  const punctuation = (text.match(/[|,\t\n\-]/g) || []).length;
  return Math.ceil(words * 1.3 + punctuation * 0.5);
}

const output = formatAsCSVWithNotes(sampleBooks);

console.log("=== CSV with Notes Column ===\n");
console.log(output);
console.log("\n=== Stats ===");
console.log(`Tokens: ~${estimateTokens(output)}`);
console.log(`Characters: ${output.length}`);

console.log("\n=== Benefits ===");
console.log("✓ Most token-efficient base format");
console.log("✓ Flexible notes column for edge cases");
console.log("✓ LLMs understand CSV natively");
console.log("✓ Empty notes column adds minimal overhead");
console.log("✓ Future-proof for new features");

console.log("\n=== Example Use Cases for Notes Column ===");
console.log("- Media type variations: 'Audiobook', 'eBook', 'DVD'");
console.log("- Hold status: 'On hold for you', 'Ready for pickup'");
console.log("- Special editions: 'Large print', 'Bilingual'");
console.log("- Condition notes: 'New arrival', 'Last copy'");
console.log("- Or leave blank for standard books");
