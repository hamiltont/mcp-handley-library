/**
 * Test script to compare token efficiency of different output formats
 * 
 * Run with: npx tsx test-format-tokens.ts
 */

// Sample data representing typical search results
const sampleBooks = [
  {
    title: "Room on the Broom",
    author: "Julia Donaldson",
    callNumber: "J DON",
    branch: "Bowman",
    status: "Available"
  },
  {
    title: "The Gruffalo",
    author: "Julia Donaldson",
    callNumber: "J DON",
    branch: "Bowman",
    status: "Checked Out"
  },
  {
    title: "Goodnight Moon",
    author: "Margaret Wise Brown",
    callNumber: "J BRO",
    branch: "Handley",
    status: "Available"
  },
  {
    title: "Where the Wild Things Are",
    author: "Maurice Sendak",
    callNumber: "J SEN",
    branch: "Bowman",
    status: "Available"
  },
  {
    title: "The Very Hungry Caterpillar",
    author: "Eric Carle",
    callNumber: "J CAR",
    branch: "Clarke County",
    status: "Available"
  }
];

// Format 1: Markdown Table
function formatAsMarkdownTable(books: typeof sampleBooks): string {
  const header = "| Title | Author | Call# | Branch | Status |";
  const separator = "|-------|--------|-------|--------|--------|";
  const rows = books.map(b => 
    `| ${b.title} | ${b.author} | ${b.callNumber} | ${b.branch} | ${b.status} |`
  );
  return [header, separator, ...rows].join("\n");
}

// Format 2: Section Headers (user's proposed format)
function formatAsSections(books: typeof sampleBooks): string {
  const example = `Format:\n## [Title]\n[Author]\n[Call#] | [Branch] | [Status]\n`;
  const sections = books.map(b => 
    `## ${b.title}\n${b.author}\n${b.callNumber} | ${b.branch} | ${b.status}`
  );
  return example + "\n" + sections.join("\n\n");
}

// Format 3: Compact sections (no example header)
function formatAsCompactSections(books: typeof sampleBooks): string {
  return books.map(b => 
    `## ${b.title}\n${b.author}\n${b.callNumber} | ${b.branch} | ${b.status}`
  ).join("\n\n");
}

// Format 4: CSV-style
function formatAsCSV(books: typeof sampleBooks): string {
  const header = "Title,Author,Call#,Branch,Status";
  const rows = books.map(b => 
    `${b.title},${b.author},${b.callNumber},${b.branch},${b.status}`
  );
  return [header, ...rows].join("\n");
}

// Format 5: TSV-style (tab-separated)
function formatAsTSV(books: typeof sampleBooks): string {
  const header = "Title\tAuthor\tCall#\tBranch\tStatus";
  const rows = books.map(b => 
    `${b.title}\t${b.author}\t${b.callNumber}\t${b.branch}\t${b.status}`
  );
  return [header, ...rows].join("\n");
}

// Format 6: Minimal with colon delimiters (user mentioned)
function formatAsColonDelimited(books: typeof sampleBooks): string {
  const example = "Format: Title / Author / Call# / Branch / Status\n\n";
  const lines = books.map(b => 
    `${b.title}\nA: ${b.author}\nC: ${b.callNumber} | ${b.branch} | ${b.status}`
  );
  return example + lines.join("\n\n");
}

// Format 7: Ultra-minimal (only show variations)
function formatAsMinimal(books: typeof sampleBooks): string {
  const example = "Format: ## Title / Author / Call# / Branch / Status\n\n";
  const lines = books.map(b => {
    // Only show status if not Available
    const status = b.status === "Available" ? "" : ` | ${b.status}`;
    return `## ${b.title}\n${b.author} | ${b.callNumber} | ${b.branch}${status}`;
  });
  return example + lines.join("\n\n");
}

// Approximate token counter (rough heuristic: 1 token ~= 4 chars for English)
function estimateTokens(text: string): number {
  // More accurate heuristic for token counting
  // - Each word is roughly 1-2 tokens
  // - Punctuation often gets its own token
  // - Whitespace is usually included with adjacent tokens
  const words = text.split(/\s+/).length;
  const punctuation = (text.match(/[|,\t\n\-]/g) || []).length;
  return Math.ceil(words * 1.3 + punctuation * 0.5);
}

// Run tests
console.log("=== Token Efficiency Comparison ===\n");
console.log(`Sample: ${sampleBooks.length} books\n`);

const formats = [
  { name: "Markdown Table", fn: formatAsMarkdownTable },
  { name: "Section Headers (with example)", fn: formatAsSections },
  { name: "Compact Sections (no example)", fn: formatAsCompactSections },
  { name: "CSV", fn: formatAsCSV },
  { name: "TSV (tab-separated)", fn: formatAsTSV },
  { name: "Colon-Delimited", fn: formatAsColonDelimited },
  { name: "Minimal (smart defaults)", fn: formatAsMinimal }
];

const results = formats.map(({ name, fn }) => {
  const output = fn(sampleBooks);
  const chars = output.length;
  const tokens = estimateTokens(output);
  return { name, output, chars, tokens };
});

// Sort by token count
results.sort((a, b) => a.tokens - b.tokens);

// Display results
results.forEach(({ name, chars, tokens }, i) => {
  const savings = i === 0 ? "baseline" : 
    `-${Math.round((1 - tokens / results[results.length - 1].tokens) * 100)}%`;
  console.log(`${i + 1}. ${name}`);
  console.log(`   ${tokens} tokens (~${chars} chars) ${savings}`);
  console.log();
});

// Show the winner
console.log("\n=== Output Examples ===\n");
console.log(`MOST EFFICIENT: ${results[0].name}\n`);
console.log(results[0].output);
console.log("\n" + "=".repeat(60) + "\n");
console.log(`LEAST EFFICIENT: ${results[results.length - 1].name}\n`);
console.log(results[results.length - 1].output);

// Analysis
console.log("\n=== Analysis ===\n");
console.log(`Best format saves ${Math.round((1 - results[0].tokens / results[results.length - 1].tokens) * 100)}% tokens vs worst format`);
console.log(`Your section format would save ~${Math.round((1 - results.find(r => r.name.includes("Section"))!.tokens / results.find(r => r.name === "Markdown Table")!.tokens) * 100)}% vs markdown tables`);
