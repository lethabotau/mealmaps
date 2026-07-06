import { clerkMiddleware, clerkClient, getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";
import type { UserIdentity } from "@mealmap/shared";

function clerkKeysConfigured(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY?.trim() &&
      process.env.CLERK_PUBLISHABLE_KEY?.trim(),
  );
}

const baseClerkMiddleware = clerkKeysConfigured()
  ? clerkMiddleware({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    })
  : null;

/**
 * Attach Clerk session on write routes only. Read paths must never run this —
 * invalid/expired session cookies on GET would otherwise 500 the whole app for
 * signed-out users who still have a stale __session cookie.
 */
export const clerkAuthMiddleware: RequestHandler = (req, res, next) => {
  if (!baseClerkMiddleware) {
    next();
    return;
  }
  baseClerkMiddleware(req, res, (err?: unknown) => {
    if (err) {
      console.warn(
        "[mealmap] Clerk session could not be verified:",
        err instanceof Error ? err.message : err,
      );
    }
    next();
  });
};

function hasAuthObject(req: Request): boolean {
  return "auth" in req && typeof req.auth === "function";
}

/** Requires a verified Clerk session on write routes only. */
export const requireWriteAuth: RequestHandler = (req, res, next) => {
  if (!clerkKeysConfigured()) {
    res.status(401).json({ error: "auth_required" });
    return;
  }
  if (!hasAuthObject(req)) {
    res.status(401).json({ error: "auth_required" });
    return;
  }

  let auth;
  try {
    auth = getAuth(req);
  } catch {
    res.status(401).json({ error: "auth_required" });
    return;
  }

  if (!auth.userId) {
    res.status(401).json({ error: "auth_required" });
    return;
  }
  next();
};

function displayNameFromClaims(
  claims: Record<string, unknown> | undefined,
): string | undefined {
  if (!claims) return undefined;
  const fullName = claims.full_name ?? claims.name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  const first = claims.first_name ?? claims.given_name;
  const last = claims.last_name ?? claims.family_name;
  if (typeof first === "string" || typeof last === "string") {
    return [first, last].filter(Boolean).join(" ").trim() || undefined;
  }
  const username = claims.username;
  if (typeof username === "string" && username.trim()) return username.trim();
  return undefined;
}

/** Identity from verified Clerk session — never from request body. */
export async function resolveAuthUser(req: Request): Promise<UserIdentity> {
  const auth = getAuth(req);
  const userId = auth.userId;
  if (!userId) {
    throw new Error("resolveAuthUser called without authenticated session");
  }

  let displayName = displayNameFromClaims(
    auth.sessionClaims as Record<string, unknown> | undefined,
  );

  if (!displayName) {
    try {
      const user = await clerkClient.users.getUser(userId);
      displayName =
        user.fullName ||
        user.username ||
        user.primaryEmailAddress?.emailAddress ||
        userId;
    } catch {
      displayName = userId;
    }
  }

  return { userId, displayName };
}
