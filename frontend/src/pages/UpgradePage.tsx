import { useState } from "react";

import {
  Crown,
  Zap,
  CheckCircle2,
  XCircle,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  FileText,
  Network,
  RefreshCw,
  Search,
  Infinity,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useAuthStore } from "../store/auth.store";
import { useItems } from "../hooks/useItems";
import { billingApi } from "../api/billing";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

const FREE_LIMIT = 100;

// ── FAQ Item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className="w-full text-left px-5 py-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-foreground leading-snug">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        )}
      </div>
      {open && (
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed text-left">{a}</p>
      )}
    </button>
  );
}

// ── Feature Row ──────────────────────────────────────────────────────────────
function FeatureRow({
  label,
  included,
}: {
  label: string;
  included: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 py-1.5 ${!included ? "opacity-50" : ""}`}>
      {included ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
      <span
        className={`text-sm ${!included ? "line-through text-muted-foreground" : "text-foreground"}`}
      >
        {label}
      </span>
      {!included && <Lock className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />}
    </div>
  );
}

const FREE_FEATURES = [
  { label: "100 items total", included: true },
  { label: "Keyword search", included: true },
  { label: "Auto-tagging + summaries", included: true },
  { label: "Real-time processing", included: true },
  { label: "Dark / light mode", included: true },
  { label: "Semantic search", included: false },
  { label: "PDF ingestion", included: false },
  { label: "Knowledge graph", included: false },
  { label: "Related items panel", included: false },
  { label: "Daily resurfacing", included: false },
];

const PRO_FEATURES = [
  { label: "Unlimited items", included: true, icon: Infinity },
  { label: "Hybrid semantic search", included: true, icon: Search },
  { label: "PDF ingestion (up to 20MB)", included: true, icon: FileText },
  { label: "Interactive knowledge graph", included: true, icon: Network },
  { label: "Related items panel", included: true, icon: Sparkles },
  { label: "Daily resurfacing digest", included: true, icon: RefreshCw },
  { label: "Priority processing", included: true },
  { label: "Everything in Free", included: true },
];

const LOCKED_FREE_FEATURES = [
  { icon: Search, label: "Semantic search" },
  { icon: FileText, label: "PDF ingestion" },
  { icon: Network, label: "Knowledge graph" },
  { icon: Sparkles, label: "Related items" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UpgradePage() {
  const { user, setAuth } = useAuthStore();
  const { data: items } = useItems();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    if (user?.plan === "pro") {
      toast.error("You are already subscribed to Pro");
      return;
    }
    
    try {
      setIsUpgrading(true);
      const res = await billingApi.subscribe();
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_dummy",
        subscription_id: res.data.subscriptionId,
        name: "Kortex",
        description: "Pro Subscription (Monthly)",
        handler: async function (response: any) {
          try {
            const verifyRes = await billingApi.verify({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySubscriptionId: response.razorpay_subscription_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast.success("Welcome to Pro!");
            setAuth({ ...user!, plan: verifyRes.data.plan }, window.localStorage.getItem("token") || ""); 
            window.location.reload(); 
          } catch (err: any) {
            toast.error(err.response?.data?.error || "Payment verification failed");
          }
        },
        theme: { color: "#4f46e5" },
        modal: {
          ondismiss: function() {
            setIsUpgrading(false);
          }
        }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
         toast.error(response.error.description);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to initialize checkout");
      setIsUpgrading(false);
    }
  };

  const isPro = user?.plan === "pro";
  const usedCount = items?.length ?? 0;
  const usagePct = Math.min((usedCount / FREE_LIMIT) * 100, 100);
  const usageColor =
    usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-400" : "bg-brand-500";

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">

          {/* Page header */}
          <div>
            <h1 className="text-xl font-semibold text-foreground">Plans & Billing</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isPro
                ? "You have full access to all Kortex features."
                : "Upgrade to Pro to unlock the full power of your second brain."}
            </p>
          </div>

          {/* ── SECTION 1 — Current Plan Banner ─────────────────────────── */}
          {isPro ? (
            /* Pro banner */
            <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-6">
              {/* Decorative orb */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <Crown className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                      You are on the Pro plan
                    </h2>
                    <Badge className="bg-emerald-500 text-white text-[10px] px-2 hover:bg-emerald-500">
                      Active
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      Active since{" "}
                      <span className="font-medium">
                        {(user as any)?.createdAt
                          ? new Date((user as any).createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                          : "—"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      All features unlocked
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Manage Subscription
                </Button>
              </div>
            </div>
          ) : (
            /* Free banner */
            <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-6">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-amber-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-amber-700 dark:text-amber-300">
                    You are on the Free plan
                  </h2>

                  {/* Usage meter */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-amber-600 dark:text-amber-400">
                        {usedCount} / {FREE_LIMIT} items used
                      </span>
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        {FREE_LIMIT - usedCount} remaining
                      </span>
                    </div>
                    <div className="h-2.5 bg-amber-200 dark:bg-amber-900/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${usageColor} rounded-full transition-all duration-500`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                    {usagePct >= 80 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                        ⚠️ You're approaching your limit — upgrade before you run out!
                      </p>
                    )}
                  </div>

                  {/* Locked features */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-2">
                      Locked on free
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {LOCKED_FREE_FEATURES.map(({ icon: Icon, label }) => (
                        <div
                          key={label}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50"
                        >
                          <Lock className="w-3 h-3 text-amber-500" />
                          <Icon className="w-3 h-3 text-amber-500" />
                          <span className="text-xs text-amber-700 dark:text-amber-300">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  disabled={isUpgrading}
                  className="shrink-0 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-700 hover:to-violet-700 text-white border-0 shadow-lg shadow-brand-500/20"
                  id="banner-upgrade-btn"
                  onClick={handleUpgrade}
                >
                  {isUpgrading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Crown className="w-3.5 h-3.5 mr-1.5" />}
                  Upgrade to Pro
                </Button>
              </div>
            </div>
          )}

          {/* ── SECTION 2 — Plan Comparison Cards ───────────────────────── */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-5">Choose your plan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* FREE CARD */}
              <div className="relative bg-card border border-border rounded-2xl p-6 flex flex-col">
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Free
                    </span>
                  </div>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-3xl font-bold text-foreground">₹0</span>
                    <span className="text-sm text-muted-foreground mb-1">/ month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Perfect for getting started
                  </p>
                </div>

                <div className="space-y-0.5 flex-1">
                  {FREE_FEATURES.map((f) => (
                    <FeatureRow key={f.label} label={f.label} included={f.included} />
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-border">
                  {isPro ? (
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled>
                      Downgrade
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      Current Plan
                    </Button>
                  )}
                </div>
              </div>

              {/* PRO CARD */}
              <div
                className="relative bg-card rounded-2xl flex flex-col overflow-hidden"
                style={{
                  border: "2px solid rgb(var(--brand))",
                  boxShadow: "0 8px 40px -8px rgba(var(--brand), 0.25)",
                }}
              >
                {/* Most Popular badge */}
                <div className="absolute -top-0 left-0 right-0 flex justify-center">
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest text-white px-4 py-1 rounded-b-lg"
                    style={{ background: "rgb(var(--brand))" }}
                  >
                    Most Popular
                  </div>
                </div>

                {/* Subtle gradient wash */}
                <div
                  className="absolute inset-0 opacity-[0.04] pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse at top right, rgb(var(--brand)), transparent 70%)",
                  }}
                />

                <div className="relative p-6 pt-8 flex flex-col flex-1">
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                        Pro
                      </span>
                    </div>
                    <div className="flex items-end gap-1 mt-2">
                      <span className="text-3xl font-bold text-foreground">₹299</span>
                      <span className="text-sm text-muted-foreground mb-1">/ month</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      For serious knowledge workers
                    </p>
                  </div>

                  <div className="space-y-0.5 flex-1">
                    {PRO_FEATURES.map((f) => (
                      <FeatureRow key={f.label} label={f.label} included={f.included} />
                    ))}
                  </div>

                  <div className="mt-6 pt-5 border-t border-border/60">
                    {isPro ? (
                      <Button
                        size="sm"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white border-0"
                        disabled
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isUpgrading}
                        id="pro-card-upgrade-btn"
                        className="w-full text-white border-0 shadow-lg"
                        style={{ background: "rgb(var(--brand))" }}
                        onClick={handleUpgrade}
                      >
                        {isUpgrading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Crown className="w-3.5 h-3.5 mr-1.5" />}
                        Upgrade to Pro — ₹299/mo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 3 — FAQ ──────────────────────────────────────────── */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-5">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              <FaqItem
                q="Can I cancel anytime?"
                a="Yes. Cancel anytime from this page. You keep Pro access until the end of your billing period — no partial refunds, but no surprise charges either."
              />
              <FaqItem
                q="What payment methods are accepted?"
                a="UPI, credit/debit cards, net banking, and wallets — all securely handled via Razorpay. Your card details are never stored on our servers."
              />
              <FaqItem
                q="Will I lose my data if I downgrade?"
                a="No. All your saved items, summaries, and tags remain intact. You simply lose access to Pro-only features like semantic search, PDF ingestion, and the knowledge graph."
              />
              <FaqItem
                q="Is there a student discount?"
                a="Yes! Reach out to us at sujayp175@gmail.com with your college email — we offer discounts for verified students."
              />
              <FaqItem
                q="What happens when I hit the 100-item limit on Free?"
                a="You won't be able to save new items until you either delete existing ones or upgrade to Pro for unlimited storage."
              />
            </div>

            {/* Support nudge */}
            <div className="mt-5 text-center">
              <p className="text-sm text-muted-foreground">
                Still have questions?{" "}
                <a
                  href="mailto:sujayp175@gmail.com"
                  className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  sujayp175@gmail.com
                </a>
              </p>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
