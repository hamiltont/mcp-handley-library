import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  console.log(`OAuth token | grant_type=${req.body?.grant_type}`);
  res.json({
    access_token: randomUUID(),
    token_type: "Bearer",
    expires_in: 3600,
    scope: "mcp:tools",
  });
}
