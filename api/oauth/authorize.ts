import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`OAuth authorize | redirect_uri=${req.query.redirect_uri} client_id=${req.query.client_id}`);
  const redirectUri = req.query.redirect_uri as string;
  const state = req.query.state as string;

  if (!redirectUri) {
    return res.status(400).json({ error: "missing redirect_uri" });
  }

  const url = new URL(redirectUri);
  url.searchParams.set("code", randomUUID());
  if (state) {
    url.searchParams.set("state", state);
  }

  res.redirect(302, url.toString());
}
