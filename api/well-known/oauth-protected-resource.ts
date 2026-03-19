import type { VercelRequest, VercelResponse } from "@vercel/node";

function getBaseUrl(req: VercelRequest): string {
  if (process.env.SERVER_URL) {
    return process.env.SERVER_URL.replace(/\/$/, "");
  }
  const host = req.headers.host || "localhost";
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const baseUrl = getBaseUrl(req);
  res.json({
    resource: `${baseUrl}/mcp`,
    authorization_servers: [baseUrl],
    scopes_supported: ["mcp:tools"],
    bearer_methods_supported: ["header"],
  });
}
