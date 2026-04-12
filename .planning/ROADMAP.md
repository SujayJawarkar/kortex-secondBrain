# Roadmap

This roadmap breaks down the **Kortex Razorpay Subscription** project into logical, sequential phases using Coarse granularity based on our preferences.

## Phase 1: Database & Initialization
**Goal:** Prepare the database schemas and initialize the Razorpay Plan on server boot.
- Modify Drizzle `users` schema to track `razorpay_customer_id`, `razorpay_subscription_id`, `subscription_status`, and `current_period_end` (**SUBS-01**).
- Implement backend startup logic to verify and dynamically create the ₹299/mo Plan avoiding manual dashboard misconfiguration (**SUBS-02**).

## Phase 2: Core APIs & Webhook Handlers
**Goal:** Build out the secure backend endpoints required to handle subscriptions heavily leaning on Razorpay Signature verification.
- Create `/subscribe` backend API to generate subscription records via Razorpay (**CHKT-01**).
- Create synchronous `/verify` API payload consumer that matches signatures instantaneously upon checkout close (**CHKT-02**).
- Create background webhook listener endpoints to process `subscription.charged`, `subscription.cancelled`, and `subscription.halted` events mapping them correctly to our database records ensuring idempotency (**WHKS-01, WHKS-02, WHKS-03**).
- Implement Resend Node SDK inside webhook listeners to distribute real-time informational emails to users (**WHKS-04**).
- Update `requirePro` middleware to authenticate correctly based on `current_period_end` allowing users to finish their cancellation billing cycles securely (**SECR-01**).

## Phase 3: Frontend Checkout & UI/UX Experience
**Goal:** Deliver a polished user interface for payment flow handling, billing history, and complex edge-case redirection.
- Integrate the Razorpay checkout popup UI initializing from the `/subscribe` `subscription_id` payload (**UIUX-01**).
- Expand checkout fallback logic catching payment failures elegantly giving the user choices to retry alternative cards or simply cancel out securely (**UIUX-02**).
- Build the "Billing History" component allowing the user to view all prior subscription invoices historically natively rendering inside Settings (**UIUX-03**).
- Defensively safeguard the frontend action intercepting active subscribers who click 'Subscribe', bouncing them to the billing page with a "You are already subscribed" prompt (**UIUX-04**).

## Phase 4+ (Future/Out of Scope)
- Global Stripe Multi-Currency expansion.
- Complex Proration models if multiple Tiers are added.
