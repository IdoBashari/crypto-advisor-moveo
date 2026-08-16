// JWT signing and verification.
//
// The token carries the user id and nothing else. Anything richer (email,
// preferences) would be a copy of database state that goes stale the moment it
// is issued, and a JWT payload is only signed, not encrypted, so it is readable
// by anyone holding the token. Callers that need more should load it by id.
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export interface VerifiedToken {
  userId: string;
}

export function signToken(userId: string): string {
  // The user id goes in the standard `sub` claim via the `subject` option
  // rather than a custom field, so any standard JWT tooling can read it.
  // `expiresIn` is a string like "24h"; the type comes from the `ms` package,
  // which cannot narrow a value read from the environment at compile time.
  return jwt.sign({}, env.jwtSecret, {
    subject: userId,
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): VerifiedToken | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret);

    // A token signed with `none`, or one whose payload is a bare string, still
    // reaches here, so the shape is checked rather than assumed.
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      return null;
    }

    return { userId: payload.sub };
  } catch {
    // jsonwebtoken throws for expired, tampered, malformed and wrongly-signed
    // tokens alike. The distinction is not useful to a caller deciding whether
    // to authenticate a request, and surfacing it invites leaking why a token
    // failed, so every failure collapses to null.
    return null;
  }
}
