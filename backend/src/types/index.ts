import { Request } from "express";

export interface AuthPayload {
  userId: string;
  email: string;
  plan: "free" | "pro";
  currentPeriodEnd?: number | null;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}
