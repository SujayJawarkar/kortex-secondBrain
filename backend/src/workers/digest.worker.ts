import { Resend } from "resend";
import { env } from "../config/env";
import { db } from "../db";
import { users } from "../db/schema";
import { resurfaceService } from "../services/resurface.service";
import { eq, isNull, or, and, lt } from "drizzle-orm";

const resend = new Resend(env.resendApiKey);
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export async function startWorker() {
  console.log(`🚀 Digest worker started (PID ${process.pid})`);

  while (true) {
    try {
      if (!env.resendApiKey) {
        console.warn("⚠️ No Resend API key found. Digest worker skipping.");
        await new Promise((r) => setTimeout(r, INTERVAL_MS));
        continue;
      }

      const now = new Date();
      // UTC representation of today 9:00 AM IST (which is UTC +5:30)
      // 9:00 AM IST = 3:30 AM UTC.
      
      const today9AmIST = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 30, 0, 0)
      );

      // We only execute digest sending if the current time has passed today's 9 AM IST mark
      if (now >= today9AmIST) {
        // Fetch 'pro' users who haven't received a digest AFTER today's 9 AM IST.
        const eligibleUsers = await db
          .select({
            id: users.id,
            email: users.email,
          })
          .from(users)
          .where(
            and(
              eq(users.plan, "pro"),
              or(
                isNull(users.lastDigestSentAt),
                lt(users.lastDigestSentAt, today9AmIST)
              )
            )
          );

        if (eligibleUsers.length > 0) {
          console.log(`⏱️ Sending daily digest to ${eligibleUsers.length} eligible pro users...`);
        }

        for (const user of eligibleUsers) {
          try {
            console.log(`✉️ Generating digest for ${user.email} (ID: ${user.id})`);
            const picks = await resurfaceService.getTodaysPicks(user.id);
            
            if (picks.length > 0) {
              const htmlContent = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                  <h2 style="color: #2563eb;">Your Daily Kortex Insights 🧠</h2>
                  <p>Hello! Here are your top resurfaced items to review today to strengthen your retention:</p>
                  <ul style="line-height: 1.6;">
                    ${picks
                      .map(
                        (p) =>
                          `<li><a href="${env.frontendUrl}/item/${p.id}" style="color: #1d4ed8; font-weight: 500;">${p.title}</a> <span style="color: #6b7280; font-size: 0.9em;">(${p.sourceType})</span></li>`
                      )
                      .join("")}
                  </ul>
                  <p style="margin-top: 30px; font-size: 0.9em; color: #6b7280;">
                    Keep building your second brain! <br/>
                    &mdash; The Kortex Team
                  </p>
                </div>
              `;

              await resend.emails.send({
                from: env.emailFrom,
                to: user.email,
                subject: "Your Daily Kortex Digest 🧠",
                html: htmlContent,
              });
              console.log(`✅ Sent digest to ${user.email}`);
            } else {
              console.log(`ℹ️ No picks available for ${user.email}. Skipping email.`);
            }

            // Update user's lastDigestSentAt to now (preventing redundant runs today)
            await db
              .update(users)
              .set({ lastDigestSentAt: new Date() })
              .where(eq(users.id, user.id));

          } catch (err: any) {
             console.error(`❌ Failed to send digest for user ${user.id}:`, err.message);
          }
        }
      }
    } catch (err: any) {
      console.error("❌ Digest worker error:", err.message);
    }
    
    // Sleep until next interval check
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}
