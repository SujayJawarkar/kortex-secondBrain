import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { ThemeProvider } from "./lib/theme";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "./components/ErrorFallback";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <App />
          <Toaster position="bottom-right" />
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
