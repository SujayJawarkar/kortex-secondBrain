import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

export function ErrorFallback({ error, resetErrorBoundary }: { error: any, resetErrorBoundary: (...args: any[]) => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full bg-card p-8 rounded-2xl border shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-6">
          An unexpected error occurred. Our team has been notified. Please try reloading the page.
        </p>

        {error?.message && (
          <div className="bg-muted p-4 rounded-lg mb-6 text-left overflow-auto max-h-32">
            <code className="text-xs text-muted-foreground break-words font-mono">
              {error.message}
            </code>
          </div>
        )}

        <Button
          onClick={() => {
            resetErrorBoundary();
            window.location.reload();
          }}
          className="w-full h-11 bg-brand hover:opacity-90 transition-opacity text-white font-medium"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload page
        </Button>
      </div>
    </div>
  );
}
