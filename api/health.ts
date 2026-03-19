import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  console.log("GET /health");
  res.json({ status: "ok", server: "handley-library", version: "1.0.0" });
}
