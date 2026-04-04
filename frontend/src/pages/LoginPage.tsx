import { useState } from "react";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import AuthLayout from "../components/layout/AuthLayout";
import { useLogin } from "../hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    login.mutate({ email, password });
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to Kortex"
      footerText="Don't have an account?"
      footerLink="Create one free"
      footerHref="/register"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {login.isError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{(login.error as any)?.response?.data?.error || "Login failed. Please verify your credentials and try again."}</p>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Email</label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            disabled={login.isPending}
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
              disabled={login.isPending}
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
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-brand hover:opacity-90 transition-opacity text-white font-medium"
          disabled={login.isPending || !email || !password}
        >
          {login.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
