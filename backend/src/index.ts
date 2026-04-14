import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { sse } from "./utils/sse";
// Routes
import authRoutes from "./routes/auth.routes";
import itemRoutes from "./routes/item.routes";
import searchRoutes from "./routes/search.routes";
import graphRoutes from "./routes/graph.routes";
import streamRoutes from "./routes/stream.routes";
import resurfaceRoutes from "./routes/resurface.routes";
import billingRoutes from "./routes/billing.routes";
// Workers
import { startWorker as startIngestWorker } from "./workers/ingest.worker";
import { startWorker as startEmbedWorker } from "./workers/embed.worker";
import { startWorker as startTagWorker } from "./workers/tag.worker";
import { startWorker as startLinkWorker } from "./workers/link.worker";
import { startWorker as startResurfaceWorker } from "./workers/resurface.worker";
import { startWorker as startDigestWorker } from "./workers/digest.worker";
import { initializeRazorpayPlan } from "./services/billing.service";

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [env.frontendUrl];
      // Allow chrome extensions and frontend URL
      if (origin.startsWith('chrome-extension://') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(morgan("dev"));

// Webhook payload parser (must precede express.json)
app.use("/api/v1/billing/webhook", express.raw({ type: "application/json" }));

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/items", itemRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/graph", graphRoutes);
app.use("/api/v1/stream", streamRoutes);
app.use("/api/v1/resurface", resurfaceRoutes);
app.use("/api/v1/billing", billingRoutes);

// Start SSE Redis subscriber
sse.startSubscriber();

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
  
  // Initialize recurring plans natively
  initializeRazorpayPlan().catch((err) => 
     console.error("Razorpay Plan verification failed during boot", err)
  );

  // Start all background workers in the same process
  startIngestWorker().catch((err) =>
    console.error("Ingest worker crashed:", err),
  );
  startEmbedWorker().catch((err) =>
    console.error("Embed worker crashed:", err),
  );
  startTagWorker().catch((err) => console.error("Tag worker crashed:", err));
  startLinkWorker().catch((err) => console.error("Link worker crashed:", err));
  startResurfaceWorker().catch((err) => console.error("Resurface worker crashed:", err));
  startDigestWorker().catch((err) => console.error("Digest worker crashed:", err));
  console.log("🔄 All background workers started in-process");
});
