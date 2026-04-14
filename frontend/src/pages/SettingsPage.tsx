import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Lock,
  Trash2,
  Crown,
  Zap,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import AppLayout from "../components/layout/AppLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useAuthStore } from "../store/auth.store";
import { authApi } from "../api/auth";
import { billingApi } from "../api/billing";

// ── Section card shell ───────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  description,
  children,
  danger = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`bg-card rounded-2xl border ${danger ? "border-red-200 dark:border-red-900/40" : "border-border"} overflow-hidden`}
    >
      <div className={`px-6 py-5 border-b ${danger ? "border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20" : "border-border bg-muted/20"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${danger ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"}`}>
            <Icon className={`w-4 h-4 ${danger ? "text-red-500" : "text-muted-foreground"}`} />
          </div>
          <div>
            <h2 className={`text-sm font-semibold ${danger ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Field row ────────────────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

// ── Password input ───────────────────────────────────────────────────────────
function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-10"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Billing history ────────────────────────────────────────────────────────
function BillingHistory() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["billing-history"],
    queryFn: async () => {
      const res = await billingApi.getHistory();
      return res.data;
    },
  });

  if (isLoading) {
    return <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>;
  }

  if (!invoices || invoices.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No past invoices available.</p>;
  }

  return (
    <div className="space-y-4">
      {invoices.map((inv: any) => (
        <div key={inv.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
          <div>
            <p className="text-sm font-semibold text-foreground">
              ₹{(inv.amount / 100).toFixed(2)} — {inv.description || "Kortex Pro Plan Renewal"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Issued on {new Date(inv.issued_at * 1000).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-3 sm:mt-0">
            <Badge variant={inv.status === "paid" ? "default" : "secondary"} className={inv.status === "paid" ? "bg-emerald-500 hover:bg-emerald-600 text-white uppercase text-[10px]" : "uppercase text-[10px]"}>
              {inv.status}
            </Badge>
            {inv.short_url && (
              <a href={inv.short_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:hover:text-brand-400">
                View PDF
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Change password state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isPro = user?.plan === "pro";
  const memberSince = (user as any)?.createdAt
    ? new Date((user as any).createdAt).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    })
    : "—";

  // ── Change password mutation ─────────────────────────────────────────────
  const changePwMutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPw, newPw),
    onSuccess: () => {
      toast.success("Password updated successfully");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update password");
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPw.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    changePwMutation.mutate();
  };

  // ── Delete account mutation ──────────────────────────────────────────────
  const deleteAccountMutation = useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSuccess: () => {
      toast.success("Account deleted. Goodbye!", { duration: 5000 });
      queryClient.clear();
      clearAuth();
      navigate("/login", { replace: true });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete account");
    },
  });

  const handleDeleteAccount = () => {
    if (deleteConfirm !== user?.email) {
      toast.error("Email does not match");
      return;
    }
    deleteAccountMutation.mutate();
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          {/* Page header */}
          <div className="mb-2">
            <h1 className="text-xl font-semibold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your account, plan, and security preferences
            </p>
          </div>

          {/* ── Account Info ─────────────────────────────────────────────── */}
          <Section
            icon={User}
            title="Account"
            description="Your profile and membership information"
          >
            <Field label="Email address" value={user?.email ?? "—"} />
            <div className="flex items-center justify-between py-2.5 border-b border-border">
              <span className="text-sm text-muted-foreground">Member since</span>
              <span className="text-sm font-medium text-foreground">{memberSince}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Account ID</span>
              <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
                {user?.id}
              </span>
            </div>
          </Section>

          {/* ── Current Plan ─────────────────────────────────────────────── */}
          <Section
            icon={isPro ? Crown : Zap}
            title="Current Plan"
            description="Your subscription and usage limits"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPro
                      ? "bg-amber-100 dark:bg-amber-900/30"
                      : "bg-brand-50 dark:bg-brand-950/40"
                    }`}
                >
                  {isPro ? (
                    <Crown className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Zap className="w-5 h-5 text-brand-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isPro ? "Pro Plan" : "Free Plan"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPro
                      ? "Unlimited items · PDF ingestion · Semantic graph"
                      : "Up to 100 items · URL & notes only"}
                  </p>
                </div>
              </div>
              <Badge
                variant={isPro ? "default" : "secondary"}
                className={`text-xs px-2.5 py-1 ${isPro ? "bg-amber-500 text-white hover:bg-amber-500" : ""}`}
              >
                {isPro ? "Active" : "Free"}
              </Badge>
            </div>

            {/* Plan features */}
            <div className="mt-5 space-y-2">
              {[
                { label: "Items saved", included: true },
                { label: "URL ingestion", included: true },
                { label: "Note capture", included: true },
                { label: "AI summaries & tags", included: true },
                { label: "Semantic search", included: isPro },
                { label: "PDF ingestion", included: isPro },
                { label: "Knowledge graph", included: isPro },
                { label: "Unlimited items", included: isPro },
              ].map(({ label, included }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${included ? "text-emerald-500" : "text-muted-foreground/30"
                      }`}
                  />
                  <span
                    className={`text-sm ${included ? "text-foreground" : "text-muted-foreground/50 line-through"
                      }`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {!isPro && (
              <div className="mt-5 pt-5 border-t border-border">
                <div className="rounded-xl bg-gradient-to-br from-brand-50 to-violet-50 dark:from-brand-950/40 dark:to-violet-950/30 border border-brand-200 dark:border-brand-800/40 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Upgrade to Pro</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Unlock everything · Cancel anytime
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-700 hover:to-violet-700 text-white border-0"
                  >
                    Upgrade →
                  </Button>
                </div>
              </div>
            )}
          </Section>

          {/* ── Billing History ────────────────────────────────────────────── */}
          {isPro && (
            <Section
              icon={FileText}
              title="Billing History"
              description="View your recent invoices and renewals"
            >
              <BillingHistory />
            </Section>
          )}

          {/* ── Change Password ───────────────────────────────────────────── */}
          <Section
            icon={Lock}
            title="Change Password"
            description="Update your account password"
          >
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="current-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Current password
                </label>
                <PasswordInput
                  id="current-password"
                  value={currentPw}
                  onChange={setCurrentPw}
                  placeholder="Enter current password"
                  disabled={changePwMutation.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  New password
                </label>
                <PasswordInput
                  id="new-password"
                  value={newPw}
                  onChange={setNewPw}
                  placeholder="At least 8 characters"
                  disabled={changePwMutation.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Confirm new password
                </label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPw}
                  onChange={setConfirmPw}
                  placeholder="Repeat new password"
                  disabled={changePwMutation.isPending}
                />
              </div>

              {/* Strength hint */}
              {newPw.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className={`h-1 flex-1 rounded-full transition-colors ${newPw.length >= n * 3
                            ? newPw.length >= 12
                              ? "bg-emerald-500"
                              : newPw.length >= 8
                                ? "bg-yellow-400"
                                : "bg-red-400"
                            : "bg-muted"
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {newPw.length >= 12 ? "Strong" : newPw.length >= 8 ? "Good" : "Weak"}
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={changePwMutation.isPending || !currentPw || !newPw || !confirmPw}
                  className="px-5"
                  id="save-password-btn"
                >
                  {changePwMutation.isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Updating…</>
                  ) : (
                    <><Shield className="w-3.5 h-3.5 mr-1.5" /> Update password</>
                  )}
                </Button>
              </div>
            </form>
          </Section>

          {/* ── Delete Account ────────────────────────────────────────────── */}
          <Section
            icon={Trash2}
            title="Delete Account"
            description="Permanently delete your account and all your data"
            danger
          >
            {!showDeleteConfirm ? (
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    This will permanently delete your account, all saved items, embeddings, tags, and the knowledge graph.{" "}
                    <span className="font-semibold text-red-500">This cannot be undone.</span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  id="show-delete-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30 shrink-0"
                >
                  Delete account
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Type your email address <strong>{user?.email}</strong> to confirm deletion.
                  </p>
                </div>
                <Input
                  id="delete-confirm-input"
                  value={deleteConfirm}
                  onChange={(e: any) => setDeleteConfirm(e.target.value)}
                  placeholder={user?.email}
                  className="border-red-200 dark:border-red-900/50 focus:border-red-400"
                  disabled={deleteAccountMutation.isPending}
                />
                <div className="flex items-center gap-3 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirm(""); }}
                    disabled={deleteAccountMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    id="confirm-delete-btn"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirm !== user?.email || deleteAccountMutation.isPending}
                    className="bg-red-500 hover:bg-red-600 text-white border-0"
                  >
                    {deleteAccountMutation.isPending ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Deleting…</>
                    ) : (
                      <><Trash2 className="w-3.5 h-3.5 mr-1.5" /> Yes, delete everything</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </AppLayout>
  );
}
