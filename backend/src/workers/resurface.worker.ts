import { resurfaceService } from "../services/resurface.service";

// Default interval: 1 hour
const INTERVAL_MS = 60 * 60 * 1000;

export async function startWorker() {
  console.log(`🚀 Resurface worker started (PID ${process.pid})`);

  while (true) {
    try {
      console.log("⏱️ Starting resurface decay loop...");
      const start = Date.now();
      await resurfaceService.computeAllDecayScores();
      const elapsed = Date.now() - start;
      console.log(`✅ Resurface decay loop completed in ${elapsed}ms`);
    } catch (err: any) {
      console.error("❌ Resurface worker error:", err.message);
    }
    
    // Sleep until next interval
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}
