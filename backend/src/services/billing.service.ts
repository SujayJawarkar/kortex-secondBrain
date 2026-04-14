import { razorpay } from "../config/razorpay";
import { env } from "../config/env";
import crypto from "crypto";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

const resend = new Resend(env.resendApiKey || "mock");

let cachedPlanId: string | null = null;

export const initializeRazorpayPlan = async () => {
  try {
    if (!env.razorpayKeyId || env.razorpayKeyId === "dummy") {
      console.warn("Razorpay keys not configured. Skipping Plan Initialization.");
      return null;
    }

    if (cachedPlanId) return cachedPlanId;

    const plans = await razorpay.plans.all();
    const proPlan = plans.items.find(
      (plan) => plan.item.name === "Kortex Pro" && plan.item.amount === 29900
    );

    if (proPlan) {
      console.log(`Razorpay Plan Initialized: ${proPlan.id}`);
      cachedPlanId = proPlan.id;
      return proPlan.id;
    }

    const newPlan = await razorpay.plans.create({
      period: "monthly",
      interval: 1,
      item: {
        name: "Kortex Pro",
        amount: 29900,
        currency: "INR",
        description: "Access to Kortex Pro Features (Unlimited, Vectors, etc.)"
      },
    });

    console.log(`Razorpay Plan Initialized (Created New): ${newPlan.id}`);
    cachedPlanId = newPlan.id;
    return newPlan.id;
  } catch (error) {
    console.error("Failed to initialize Razorpay Plan:", error);
    return null;
  }
};

export const createSubscription = async (userId: string) => {
  let planId = await initializeRazorpayPlan();
  if (!planId) throw new Error("Billing plan is not initialized on the server yet.");

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 120, // max 10 years auto-renewal
    customer_notify: 1,
  });

  await db.update(users)
    .set({ razorpaySubscriptionId: subscription.id, subscriptionStatus: "created" })
    .where(eq(users.id, userId));

  return subscription;
};

export const verifyPayment = async (userId: string, paymentId: string, subscriptionId: string, signature: string) => {
  const generatedSignature = crypto
    .createHmac("sha256", env.razorpayKeySecret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");

  if (generatedSignature !== signature) {
    throw new Error("Invalid payment signature");
  }

  const [updatedUser] = await db.update(users)
    .set({ plan: "pro", subscriptionStatus: "active" })
    .where(eq(users.id, userId))
    .returning();

  return updatedUser;
};

export const handleWebhook = async (rawBody: string | Buffer, signature: string) => {
  const generatedSignature = crypto
    .createHmac("sha256", env.razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");

  if (generatedSignature !== signature) {
    throw new Error("Invalid webhook signature");
  }

  const payload = JSON.parse(rawBody.toString());
  const event = payload.event;
  const subscriptionId = payload.payload?.subscription?.entity?.id;

  if (!subscriptionId) return { received: true };

  const [user] = await db.select().from(users).where(eq(users.razorpaySubscriptionId, subscriptionId)).limit(1);
  
  if (!user) {
    console.warn(`Webhook received for unknown subscription: ${subscriptionId}`);
    return { received: true };
  }

  try {
    switch (event) {
      case "subscription.charged":
        const currentEnd = payload.payload.subscription.entity.current_end;
        await db.update(users)
          .set({ 
            subscriptionStatus: "active", 
            plan: "pro",
            currentPeriodEnd: new Date(currentEnd * 1000) 
          })
          .where(eq(users.id, user.id));
        
        if (env.resendApiKey && env.resendApiKey !== "dummy") {
          await resend.emails.send({
            from: env.emailFrom,
            to: user.email,
            subject: "Your Kortex Pro Subscription Renewed",
            html: `<p>Your subscription was successfully charged. Thank you for continuing to support Kortex!</p>`
          });
        }
        break;

      case "subscription.cancelled":
      case "subscription.halted":
        await db.update(users)
          .set({ subscriptionStatus: "cancelled" })
          .where(eq(users.id, user.id));
          
        if (env.resendApiKey && env.resendApiKey !== "dummy") {
          await resend.emails.send({
            from: env.emailFrom,
            to: user.email,
            subject: "Your Kortex Pro Subscription is Cancelled",
            html: `<p>Your subscription has been safely cancelled. Your benefits will remain active until the end of the current billing cycle.</p>`
          });
        }
        break;
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
  }

  return { received: true };
};

export const getBillingHistory = async (userId: string) => {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.razorpaySubscriptionId) {
    return [];
  }
  
  try {
    const invoices = await razorpay.invoices.all({ subscription_id: user.razorpaySubscriptionId });
    return invoices.items;
  } catch (error) {
    console.error("Failed to fetch billing history:", error);
    return [];
  }
};
