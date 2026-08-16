// Password hashing and verification.
//
// Everything that turns a plaintext password into a stored hash, or checks one
// against it, lives here so the cost factor is defined in exactly one place.
// Plaintext passwords are never logged, and never appear in a thrown error.
import bcrypt from "bcryptjs";

// bcrypt work factor. Each increment doubles the work, so this is the dial
// between resisting offline cracking and keeping login latency acceptable.
// 12 costs roughly a quarter second per hash on current hardware, which is
// slow enough to be expensive in bulk and fast enough for a login request.
const COST_FACTOR = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  // bcrypt.compare throws on an empty or structurally invalid hash. A stored
  // hash that is corrupt or missing means "this password does not match", not
  // "the caller made a mistake", so callers get false instead of an exception
  // and cannot accidentally treat a thrown error as a successful login.
  if (!hash) {
    return false;
  }

  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    // Deliberately swallowing the error: it can only describe the malformed
    // hash, and anything logged here would sit next to the plaintext argument.
    return false;
  }
}
