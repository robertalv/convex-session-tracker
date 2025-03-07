import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Cron job configuration for automated session cleanup.
 * 
 * By default, this will:
 * - Run daily at 2:30 AM UTC
 * - Remove sessions that haven't been active for 14 days
 * 
 * This time is chosen to minimize impact on active users.
 * 
 * @example
 * ```typescript
 * // In your convex/crons.ts file
 * import { cronJobs } from "convex/server";
 * import sessionCrons from "@devwithbobby/anonymous-tracker/crons";
 * 
 * const crons = cronJobs();
 * 
 * // Add session cleanup cron
 * sessionCrons(crons);
 * 
 * // Add your other cron jobs
 * crons.daily("my-job", ...);
 * 
 * export default crons;
 * ```
 */

const crons = cronJobs();

// Run sessions cleanup daily at 2:30 AM UTC
// This time is chosen to minimize impact on active users
crons.daily(
  "cleanup-old-sessions",
  { hourUTC: 2, minuteUTC: 30 },
  internal.sessions.cleanupOldSessions_internal,
  { daysInactive: 14 }
);

export default crons; 