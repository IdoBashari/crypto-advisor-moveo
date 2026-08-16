// Public auth endpoints.
//
// The route layer only translates: request body in, status code and JSON out.
// Validation happens before the service is called, and the service's typed
// AuthError is mapped to a status here so no error string is ever parsed.
// Nothing in this file touches Prisma, bcrypt or a password hash.
import { Router } from "express";
import type { ZodError, ZodType } from "zod";
import { loginSchema, registerSchema } from "../auth/schemas.js";
import { AuthError, loginUser, registerUser } from "../services/auth.service.js";

const router = Router();

// Both failure modes of login answer with this exact object. Distinguishing
// "no such email" from "wrong password" would turn the endpoint into a way to
// enumerate registered addresses.
const INVALID_CREDENTIALS_BODY = {
  error: "Invalid email or password",
} as const;

function fieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "_";
    (fields[field] ??= []).push(issue.message);
  }
  return fields;
}

// Returns the parsed value, or null after having sent a 400 naming the fields
// that failed. Only messages produced by the schema are echoed back; the raw
// request body is never reflected, so a submitted password cannot come back.
function parseBody<T>(
  schema: ZodType<T>,
  body: unknown,
  res: Parameters<Parameters<typeof router.post>[1]>[1],
): T | null {
  const result = schema.safeParse(body);
  if (result.success) {
    return result.data;
  }

  res.status(400).json({
    error: "Validation failed",
    fields: fieldErrors(result.error),
  });
  return null;
}

router.post("/register", async (req, res) => {
  const input = parseBody(registerSchema, req.body, res);
  if (!input) return;

  try {
    const { user, token } = await registerUser(input);
    res.status(201).json({ user, token });
  } catch (error) {
    if (error instanceof AuthError && error.code === "EMAIL_TAKEN") {
      res.status(409).json({ error: "Email is already registered" });
      return;
    }
    // Anything else is a bug or an outage. It is logged server-side and the
    // client gets a bare 500: a raw Prisma error would leak schema details.
    console.error("POST /auth/register failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const input = parseBody(loginSchema, req.body, res);
  if (!input) return;

  try {
    const { user, token } = await loginUser(input);
    res.status(200).json({ user, token });
  } catch (error) {
    if (error instanceof AuthError && error.code === "INVALID_CREDENTIALS") {
      res.status(401).json(INVALID_CREDENTIALS_BODY);
      return;
    }
    console.error("POST /auth/login failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
