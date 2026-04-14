import { api } from "./client";

export const billingApi = {
  subscribe: () => api.post("/billing/subscribe"),
  verify: (data: { razorpayPaymentId: string; razorpaySubscriptionId: string; razorpaySignature: string }) => 
    api.post("/billing/verify", data),
  getHistory: () => api.get("/billing/history"),
};
