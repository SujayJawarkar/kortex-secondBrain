import { Router, Request, Response } from "express";
import { createSubscription, verifyPayment, handleWebhook, getBillingHistory } from "../services/billing.service";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";

const router = Router();

router.post("/subscribe", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const subscription = await createSubscription(req.user!.userId);
    res.json({ subscriptionId: subscription.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/verify", authenticate, async (req: AuthRequest, res: Response) => {
  const { razorpayPaymentId, razorpaySubscriptionId, razorpaySignature } = req.body;
  if (!razorpayPaymentId || !razorpaySubscriptionId || !razorpaySignature) {
    res.status(400).json({ error: "Missing verification fields" });
    return;
  }

  try {
    const updatedUser = await verifyPayment(
      req.user!.userId,
      razorpayPaymentId,
      razorpaySubscriptionId,
      razorpaySignature
    );
    res.json({ message: "Payment verified successfully", plan: updatedUser.plan });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/history", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const history = await getBillingHistory(req.user!.userId);
    res.json(history);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Important: req.body here MUST be a Buffer.
// Handled by overriding via express.raw() in index.ts
router.post("/webhook", async (req: Request, res: Response) => {
  const signature = req.headers["x-razorpay-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(400).json({ error: "Missing razorpay signature" });
    return;
  }

  try {
    await handleWebhook(req.body, signature);
    res.json({ status: "success" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
