import { db, users, sessions } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "session_token";
const SESSION_DURATION_DAYS = 30;

// Generate secure session token
export function generateSessionToken(): string {
  return crypto.randomUUID() + crypto.randomUUID();
}

// Hash password with bcrypt
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create session in database
export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
    userAgent,
    ipAddress,
  });

  return token;
}

// Set session cookie
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

// Get current session token from cookies
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

// Validate session and return user
export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;

  const result = await db.query.sessions.findFirst({
    where: and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
    with: {
      user: true,
    },
  });

  if (!result) return null;

  // Return user without password hash
  const { passwordHash, ...userWithoutPassword } = result.user;
  return userWithoutPassword;
}

// Check if user is admin
export function isAdmin(user: { role: string } | null): boolean {
  return user?.role === "admin";
}

// Delete session (logout)
export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

// Delete session cookie
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Delete all sessions for a user (logout everywhere)
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

// Find user by email
export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
}

// Create new user
export async function createUser(data: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}) {
  const [user] = await db
    .insert(users)
    .values({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
    })
    .returning();

  return user;
}
