// Bearer token authentication.
//
// This middleware answers exactly one question: does the request carry a
// currently valid token? It deliberately does not touch the database — a route
// that needs the user record loads it itself, so protecting an endpoint that
// only needs the id costs no query.
//
// Every rejection returns the same body. Distinguishing "no header" from
// "expired" from "bad signature" would tell a caller probing the endpoint which
// part of their forgery to fix, and it is not information a legitimate client
// can act on differently.
import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../auth/token.js";

export const UNAUTHORIZED_BODY = { error: "Unauthorized" } as const;

// Scheme is matched case-insensitively per RFC 7235, which defines the auth
// scheme as a case-insensitive token. The token itself must be a single
// non-empty run of non-space characters, so "Bearer " with nothing after it,
// or trailing junk, fails to match rather than being partially accepted.
const BEARER_PATTERN = /^Bearer[ \t]+(\S+)$/i;

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (typeof header !== "string") {
    res.status(401).json(UNAUTHORIZED_BODY);
    return;
  }

  const match = BEARER_PATTERN.exec(header.trim());
  if (!match) {
    res.status(401).json(UNAUTHORIZED_BODY);
    return;
  }

  // verifyToken never throws and returns null for invalid, expired, tampered
  // and malformed tokens alike. Nothing here logs the token or any part of it.
  const verified = verifyToken(match[1]);
  if (!verified) {
    res.status(401).json(UNAUTHORIZED_BODY);
    return;
  }

  req.userId = verified.userId;
  next();
}
