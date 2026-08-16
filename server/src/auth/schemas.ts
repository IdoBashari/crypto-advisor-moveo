// Request validation for the auth endpoints.
//
// The schemas are the single place where untrusted request bodies become
// trusted, typed values, so everything downstream can assume normalized input.
// Email is trimmed and lowercased before it is validated, which means the
// normalized form is what gets stored and what gets looked up — that is what
// makes the unique constraint on User.email behave case-insensitively.
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1, "Name is required").max(100),
  // Length is the only requirement. Character-class rules push people toward
  // short predictable passwords, so a long passphrase is not penalised here.
  // The upper bound exists because bcrypt silently ignores bytes past 72, and
  // because an unbounded field is free work for an attacker.
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  email: emailSchema,
  // Login only checks that something was sent. The rules that applied at
  // registration are not re-applied, so tightening them later cannot lock out
  // existing accounts.
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
