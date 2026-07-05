import { clerkMiddleware, clerkClient, getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";
import type { UserIdentity } from "@mealmap/shared";

export const clerkAuthMiddleware: RequestHandler = clerkMiddleware({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
});

/** Requires a verified Clerk session on write routes only. */
export const requireWriteAuth: RequestHandler = (req, res, next) => {
  const auth = getAuth(req);
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
