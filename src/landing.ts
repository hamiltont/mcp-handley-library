/**
 * Landing page HTML for the Handley Library MCP connector.
 * Served at "/" to explain what this service is and how to use it.
 */

export function getLandingPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Handley Library Connector for Claude</title>
  <style>
    :root {
      --cream: #faf8f4;
      --warm-white: #fff;
      --text: #2d2a26;
      --text-muted: #6b6560;
      --accent: #b45309;
      --accent-light: #f59e0b;
      --green: #16a34a;
      --green-bg: #f0fdf4;
      --border: #e7e2db;
      --card-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
      --section-gap: 3rem;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: var(--cream);
      color: var(--text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 760px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }

    /* ---- Hero ---- */
    .hero {
      text-align: center;
      padding: 3.5rem 0 2.5rem;
    }

    .hero-icon {
      font-size: 3rem;
      margin-bottom: 0.75rem;
    }

    .hero h1 {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }

    .hero .subtitle {
      font-size: 1.15rem;
      color: var(--text-muted);
      max-width: 520px;
      margin: 0 auto;
    }

    .badge {
      display: inline-block;
      background: var(--green-bg);
      color: var(--green);
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      margin-bottom: 1rem;
      border: 1px solid #bbf7d0;
    }

    /* ---- Sections ---- */
    section {
      margin-bottom: var(--section-gap);
    }

    section h2 {
      font-size: 1.35rem;
      font-weight: 700;
      margin-bottom: 1rem;
      letter-spacing: -0.01em;
    }

    /* ---- About card ---- */
    .about-card {
      background: var(--warm-white);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.75rem;
      box-shadow: var(--card-shadow);
    }

    .about-card p {
      margin-bottom: 1rem;
      color: var(--text-muted);
    }

    .about-card p:last-child {
      margin-bottom: 0;
    }

    .branches {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }

    .branch-tag {
      background: #fef3c7;
      color: var(--accent);
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.35rem 0.85rem;
      border-radius: 8px;
      border: 1px solid #fde68a;
    }

    /* ---- Features ---- */
    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.875rem;
    }

    @media (max-width: 560px) {
      .features-grid { grid-template-columns: 1fr; }
    }

    .feature {
      background: var(--warm-white);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
      box-shadow: var(--card-shadow);
    }

    .feature-icon {
      font-size: 1.5rem;
      margin-bottom: 0.4rem;
    }

    .feature h3 {
      font-size: 0.95rem;
      font-weight: 600;
      margin-bottom: 0.3rem;
    }

    .feature p {
      font-size: 0.87rem;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* ---- How it works ---- */
    .steps {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .step {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      background: var(--warm-white);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
      box-shadow: var(--card-shadow);
    }

    .step-number {
      flex-shrink: 0;
      width: 2rem;
      height: 2rem;
      background: var(--accent);
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .step-content h3 {
      font-size: 0.95rem;
      font-weight: 600;
      margin-bottom: 0.2rem;
    }

    .step-content p {
      font-size: 0.87rem;
      color: var(--text-muted);
    }

    .step-content code {
      background: #f3f0eb;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-size: 0.82rem;
      font-family: 'SF Mono', 'Fira Code', monospace;
      color: var(--accent);
      word-break: break-all;
    }

    /* ---- Screenshots ---- */
    .screenshots {
      display: flex;
      gap: 1rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      scroll-snap-type: x mandatory;
    }

    .screenshots img {
      flex-shrink: 0;
      width: min(100%, 360px);
      border-radius: 10px;
      border: 1px solid var(--border);
      box-shadow: var(--card-shadow);
      scroll-snap-align: start;
    }

    /* ---- Example prompts ---- */
    .prompts {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .prompt {
      background: var(--warm-white);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.85rem 1.1rem;
      font-size: 0.9rem;
      color: var(--text);
      font-style: italic;
      box-shadow: var(--card-shadow);
    }

    .prompt::before {
      content: '\\201C';
      font-size: 1.2rem;
      color: var(--accent-light);
      margin-right: 0.25rem;
    }

    .prompt::after {
      content: '\\201D';
      font-size: 1.2rem;
      color: var(--accent-light);
      margin-left: 0.1rem;
    }

    /* ---- Coming Soon ---- */
    .coming-soon-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .coming-soon-list li {
      background: var(--warm-white);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.85rem 1.1rem;
      font-size: 0.9rem;
      color: var(--text-muted);
      box-shadow: var(--card-shadow);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .coming-soon-list .label {
      color: var(--text);
      font-weight: 500;
    }

    .notify-link {
      flex-shrink: 0;
      font-size: 0.8rem;
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
      white-space: nowrap;
    }

    .notify-link:hover {
      text-decoration: underline;
    }

    /* ---- Footer ---- */
    footer {
      text-align: center;
      padding: 2rem 0 3rem;
      border-top: 1px solid var(--border);
      margin-top: 1rem;
    }

    footer p {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    footer a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }

    footer a:hover {
      text-decoration: underline;
    }

    .heart {
      color: #e11d48;
    }
  </style>
</head>
<body>

<div class="container">

  <!-- Hero -->
  <header class="hero">
    <div class="hero-icon">&#128218;</div>
    <span class="badge">Free &amp; Open Source</span>
    <h1>Handley Library Connector</h1>
    <p class="subtitle">Search the Handley Regional Library catalog right from Claude. Find books, check availability, and get shelf locations&mdash;all in one conversation.</p>
  </header>

  <!-- About -->
  <section>
    <h2>What is this?</h2>
    <div class="about-card">
      <p>This is a <strong>connector for Claude</strong> that gives it the ability to search the <a href="https://www.handleyregional.org/" target="_blank" rel="noopener">Handley Regional Library</a> catalog in Winchester, Virginia.</p>
      <p>Instead of switching to the library website, opening tabs, and copying call numbers, you can simply <strong>ask Claude</strong> to find books for you. It checks real-time availability across all three branches:</p>
      <div class="branches">
        <span class="branch-tag">&#127963; Handley Library &mdash; Winchester</span>
        <span class="branch-tag">&#127963; Bowman Library &mdash; Stephens City</span>
        <span class="branch-tag">&#127963; Clarke County Library &mdash; Berryville</span>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section>
    <h2>What can it do?</h2>
    <div class="features-grid">
      <div class="feature">
        <div class="feature-icon">&#128270;</div>
        <h3>Search the Catalog</h3>
        <p>Find books by title, author, series, subject, or ISBN&mdash;just like you would at the library, but faster.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">&#9989;</div>
        <h3>Check Availability</h3>
        <p>See which books are available right now and at which branch, so you know before you go.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">&#128204;</div>
        <h3>Get Shelf Locations</h3>
        <p>Heading to the library? Get the exact call numbers so you can walk right to the shelf.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">&#128218;</div>
        <h3>Search Multiple Books at Once</h3>
        <p>Looking for a whole list? Search for up to 20 books in a single request.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">&#127968;</div>
        <h3>Filter by Branch</h3>
        <p>Only interested in what&rsquo;s at your closest branch? Filter results to just that location.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">&#128172;</div>
        <h3>Natural Conversations</h3>
        <p>No search forms or filters to learn. Just ask Claude in plain English, like you&rsquo;d ask a librarian.</p>
      </div>
    </div>
  </section>

  <!-- How to connect -->
  <section>
    <h2>How to connect</h2>
    <div class="steps">
      <div class="step">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3>Open Claude Settings</h3>
          <p>Go to <strong>Connectors</strong> in your Claude settings and click the <strong>+</strong> button, then choose <strong>Add custom connector</strong>.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3>Enter the connector URL</h3>
          <p>Name it <strong>Handley Library</strong> and paste the URL:<br><code>https://mcp-handley-library.vercel.app</code></p>
        </div>
      </div>
      <div class="step">
        <div class="step-number">3</div>
        <div class="step-content">
          <h3>Start searching!</h3>
          <p>Open a new conversation in Claude and ask it to find books at the Handley Library. That&rsquo;s it!</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Example prompts -->
  <section>
    <h2>Things you can ask</h2>
    <div class="prompts">
      <div class="prompt">Find books by Julia Donaldson available at Bowman Library</div>
      <div class="prompt">My son loves dinosaurs. What picture books does the library have?</div>
      <div class="prompt">Is &ldquo;Dog Man&rdquo; available at any branch right now?</div>
      <div class="prompt">Show me what&rsquo;s on the shelf at Handley for early readers</div>
      <div class="prompt">Check if these books are available: Room on the Broom, The Gruffalo, Stick Man</div>
    </div>
  </section>

  <!-- Coming soon -->
  <section>
    <h2>Coming soon</h2>
    <p style="color: var(--text-muted); margin-bottom: 1rem; font-size: 0.93rem;">We&rsquo;re working on these features. Want to know when they&rsquo;re ready? Click to let us know.</p>
    <ul class="coming-soon-list">
      <li>
        <span class="label">&#128278; Place holds automatically</span>
        <a class="notify-link" href="mailto:support@522software.com?subject=Notify%20me%3A%20Auto-hold%20placement&body=Hi!%20Please%20let%20me%20know%20when%20automatic%20hold%20placement%20is%20available%20for%20the%20Handley%20Library%20connector.%20Thanks!">Notify me &rarr;</a>
      </li>
      <li>
        <span class="label">&#128203; View your current holds</span>
        <a class="notify-link" href="mailto:support@522software.com?subject=Notify%20me%3A%20View%20current%20holds&body=Hi!%20Please%20let%20me%20know%20when%20I%20can%20view%20my%20current%20holds%20through%20the%20Handley%20Library%20connector.%20Thanks!">Notify me &rarr;</a>
      </li>
      <li>
        <span class="label">&#127911; Audiobook &amp; eBook filtering</span>
        <a class="notify-link" href="mailto:support@522software.com?subject=Notify%20me%3A%20Audiobook%20%26%20eBook%20filtering&body=Hi!%20Please%20let%20me%20know%20when%20audiobook%20and%20eBook%20filtering%20is%20available%20for%20the%20Handley%20Library%20connector.%20Thanks!">Notify me &rarr;</a>
      </li>
      <li>
        <span class="label">&#128214; Checkout history</span>
        <a class="notify-link" href="mailto:support@522software.com?subject=Notify%20me%3A%20Checkout%20history&body=Hi!%20Please%20let%20me%20know%20when%20checkout%20history%20is%20available%20for%20the%20Handley%20Library%20connector.%20Thanks!">Notify me &rarr;</a>
      </li>
      <li>
        <span class="label">&#128161; Reading recommendations</span>
        <a class="notify-link" href="mailto:support@522software.com?subject=Notify%20me%3A%20Reading%20recommendations&body=Hi!%20Please%20let%20me%20know%20when%20personalized%20reading%20recommendations%20are%20available%20for%20the%20Handley%20Library%20connector.%20Thanks!">Notify me &rarr;</a>
      </li>
    </ul>
  </section>

</div>

<!-- Footer -->
<footer>
  <div class="container">
    <p>Made with <span class="heart">&hearts;</span> in Winchester, Virginia by <a href="https://www.522software.com" target="_blank" rel="noopener">522 Software</a></p>
  </div>
</footer>

</body>
</html>`;
}
