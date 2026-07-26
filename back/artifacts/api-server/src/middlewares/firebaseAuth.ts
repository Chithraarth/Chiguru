import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, ownersTable, type Owner } from "@workspace/db";
import { firebaseAuth } from "../lib/firebase-admin";
import { logger } from "../lib/logger";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The signed-in Owner, if the request carried a valid Firebase ID token. */
      owner?: Owner;
    }
  }
}

/**
 * Verifies a Firebase ID token (Authorization: Bearer <token>) if present and
 * upserts the corresponding Owner row (create on first sign-in, otherwise bump
 * lastLogin). Never blocks the request itself — an invalid/missing token just
 * leaves req.owner unset; routes that require a signed-in Owner use the
 * requireOwner guard below.
 */
export async function firebaseAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) return next();

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);

    const [existing] = await db
      .select()
      .from(ownersTable)
      .where(eq(ownersTable.firebaseUid, decoded.uid));

    if (existing) {
      const [updated] = await db
        .update(ownersTable)
        .set({
          lastLogin: new Date(),
          // Keep profile fields fresh in case the farmer updated their name/photo
          // with the provider, or verified an email/phone since we last saw them.
          fullName: decoded.name ?? existing.fullName,
          email: decoded.email ?? existing.email,
          mobileNumber: decoded.phone_number ?? existing.mobileNumber,
          profileImage: decoded.picture ?? existing.profileImage,
        })
        .where(eq(ownersTable.id, existing.id))
        .returning();
      req.owner = updated;
    } else {
      const [created] = await db
        .insert(ownersTable)
        .values({
          firebaseUid: decoded.uid,
          fullName: decoded.name ?? null,
          email: decoded.email ?? null,
          mobileNumber: decoded.phone_number ?? null,
          profileImage: decoded.picture ?? null,
          loginProvider: decoded.firebase?.sign_in_provider ?? null,
          role: "OWNER",
          status: "ACTIVE",
        })
        .returning();
      req.owner = created;
    }
  } catch (err) {
    // Expired/invalid token — treat as signed-out rather than failing the request;
    // requireOwner (below) is what actually enforces auth where it matters.
    logger.warn({ err }, "Firebase ID token verification failed");
  }

  next();
}

/** Route guard: 401s if firebaseAuthMiddleware didn't attach a signed-in Owner. */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.owner) {
    res.status(401).json({ message: "Sign in required", code: "AUTH_REQUIRED" });
    return;
  }
  next();
}
