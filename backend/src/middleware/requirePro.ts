import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";

export function requirePro(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const hasProPlan = req.user?.plan === "pro";
  const hasGracePeriod = req.user?.currentPeriodEnd && req.user.currentPeriodEnd > Date.now();

  if (!hasProPlan && !hasGracePeriod) {
    res.status(403).json({
      error: "Pro plan required",
      message: "Upgrade to Pro to access this feature.",
      upgrade_url: "/billing/subscribe",
    });
    return;
  }
  next();
}
