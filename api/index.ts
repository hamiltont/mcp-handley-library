import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLandingPageHtml } from "../src/landing.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(getLandingPageHtml());
}
