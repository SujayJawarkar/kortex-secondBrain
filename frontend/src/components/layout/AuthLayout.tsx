import { Brain, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../lib/theme";

interface Props {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footerText: string;
  footerLink: string;
  footerHref: string;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
  footerText,
  footerLink,
  footerHref,
}: Props) {
  const { isDark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Theme Toggle Button */}
      <button
        onClick={toggle}
        className="absolute top-6 right-6 p-2.5 rounded-full bg-card border border-border shadow-sm text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-amber-500" />
        ) : (
          <Moon className="w-5 h-5 text-indigo-500" />
        )}
      </button>

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand dark:bg-background/90 dark:border-r border-border flex-col justify-between p-12 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 dark:bg-brand/20 flex items-center justify-center transition-colors">
            <Brain className="w-5 h-5 text-white dark:text-brand transition-colors" />
          </div>
          <span className="text-white dark:text-foreground font-semibold text-lg transition-colors">Second Brain</span>
        </div>

        <div>
          <blockquote className="text-white/90 dark:text-foreground/90 text-2xl font-light leading-relaxed mb-6 transition-colors">
            "The mind is not a vessel to be filled, but a fire to be kindled."
          </blockquote>
          <p className="text-white/60 dark:text-muted-foreground text-sm transition-colors">— Plutarch</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Items saved", value: "10K+" },
            { label: "Connections", value: "50K+" },
            { label: "Ideas resurfaced", value: "5K+" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 dark:bg-card/50 dark:border dark:border-border rounded-2xl p-4 transition-all">
              <p className="text-white dark:text-foreground text-2xl font-bold transition-colors">{stat.value}</p>
              <p className="text-white/60 dark:text-muted-foreground text-xs mt-1 transition-colors">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand dark:bg-brand/20 flex items-center justify-center transition-colors">
              <Brain className="w-4 h-4 text-white dark:text-brand" />
            </div>
            <span className="font-semibold text-foreground">Second Brain</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
          </div>

          {children}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footerText}{" "}
            <Link
              to={footerHref}
              className="text-brand font-medium hover:underline"
            >
              {footerLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
