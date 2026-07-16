import { Router } from "express";
import { Webhook } from "svix";
import { deleteUser } from "../lib/userProvisioning";
import { logger } from "../lib/logger";

const webhooksRouter = Router();

/**
 * POST /api/webhooks/clerk
 *
 * Receives Clerk webhook events.  Must be mounted BEFORE express.json() so
 * the raw request body is available for svix signature verification.
 */
webhooksRouter.post("/clerk", async (req, res) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("CLERK_WEBHOOK_SECRET is not set — webhook disabled");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  // svix needs the raw body as a string or Buffer
  const rawBody: Buffer = req.body as Buffer;
  const svixId = req.headers["svix-id"] as string | undefined;
  const svixTimestamp = req.headers["svix-timestamp"] as string | undefined;
  const svixSignature = req.headers["svix-signature"] as string | undefined;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ error: "Missing svix headers" });
    return;
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(secret);
    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch (err) {
    logger.warn({ err }, "Clerk webhook signature verification failed");
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  logger.info({ type: event.type }, "Clerk webhook received");

  if (event.type === "user.deleted") {
    const clerkUserId = event.data.id as string | undefined;
    if (!clerkUserId) {
      res.status(400).json({ error: "Missing user id in event data" });
      return;
    }
    try {
      await deleteUser(clerkUserId);
      logger.info({ clerkUserId }, "User data deleted via webhook");
    } catch (err) {
      logger.error({ err, clerkUserId }, "Failed to delete user data");
      res.status(500).json({ error: "Failed to delete user data" });
      return;
    }
  }

  res.status(200).json({ received: true });
});

export default webhooksRouter;
