import { useState } from "react";
import { Eye, EyeOff, Loader2, Check, X, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import AuthLayout from "../components/layout/AuthLayout";
import { useRegister } from "../hooks/useAuth";

function PasswordRule({ met, text }: { met: boolean; text: string }) {
  return (
    <div
      className={`flex items-center gap-2 text-xs transition-colors ${met ? "text-green-500" : "text-muted-foreground"
        }`}
    >
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {text}
    </div>
  );
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const register = useRegister();

  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const allRulesMet = Object.values(rules).every(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !allRulesMet) return;
    register.mutate({ email, password });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start building your Second Brain on Kortex today — free forever"
      footerText="Already have an account?"
      footerLink="Sign in"
      footerHref="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {register.isError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{(register.error as any)?.response?.data?.error || "Registration failed. Please check your details."}</p>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Email</label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={register.isPending}
            className="h-11"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Password
          </label>
          <div className="relative">
            <Input
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={register.isPending}
              className="h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPass ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {password.length > 0 && (
            <div className="space-y-1 pt-1">
              <PasswordRule met={rules.length} text="At least 8 characters" />
              <PasswordRule met={rules.upper} text="One uppercase letter" />
              <PasswordRule met={rules.number} text="One number" />
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-brand hover:opacity-90 transition-opacity text-white font-medium"
          disabled={register.isPending || !email || !allRulesMet}
        >
          {register.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating
              account...
            </>
          ) : (
            "Create account"
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Free plan includes 100 items. No credit card required.
        </p>
      </form>
    </AuthLayout>
  );
}
