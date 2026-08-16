// Registration and login.
//
// This layer owns the database and the auth utilities: routes call in with
// already-validated input and get back a plain result, so nothing above it
// imports Prisma or bcrypt. Keeping that boundary is what guarantees the
// password hash never reaches a response — it is selected out here and the
// public user shape has no field for it.
import { prisma } from "../prisma.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { signToken } from "../auth/token.js";
import type { LoginInput, RegisterInput } from "../auth/schemas.js";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
}

// Failure kinds are an enum rather than a message string so routes can map
// them to status codes without matching on prose that might later be reworded.
export type AuthErrorCode = "EMAIL_TAKEN" | "INVALID_CREDENTIALS";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

// Selecting explicitly rather than relying on a later `delete user.passwordHash`
// means a new column added to User is not silently exposed.
const publicUserSelect = { id: true, email: true, name: true } as const;

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);

  // The unique constraint is the authority on whether the email is taken. A
  // read-then-write check would leave a window where two concurrent requests
  // both see the address as free, so the insert is attempted and P2002 is
  // translated instead.
  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
      },
      select: publicUserSelect,
    });

    return { user, token: signToken(user.id) };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw new AuthError("EMAIL_TAKEN", "Email is already registered");
    }
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...publicUserSelect, passwordHash: true },
  });

  // An unknown email and a wrong password must be indistinguishable. Returning
  // early on a missing user would also skip the bcrypt comparison and answer
  // measurably faster, so a dummy verify runs in that case to keep the timing
  // and the thrown error the same on both paths.
  if (!user) {
    await verifyPassword(input.password, DUMMY_HASH);
    throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
  }

  const { passwordHash: _passwordHash, ...publicUser } = user;
  return { user: publicUser, token: signToken(publicUser.id) };
}

// A real bcrypt hash of an unguessable value, used only to spend the same work
// as a genuine comparison when the email does not exist. It is a constant so
// the cost is paid on the comparison, not on generating it per request.
const DUMMY_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9pWKlDJk/Kh1YoJhO0m2iL0mnXqZQmC";

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
