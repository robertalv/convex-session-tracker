import { mutation, query, internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

/**
 * Track a user session by creating or updating a session record.
 * This function is called automatically by the SessionTracker component.
 * 
 * @example
 * ```typescript
 * const trackSession = useMutation(api.sessions.trackSession);
 * trackSession({ anonymousId: "user123" });
 * ```
 */
export const trackSession = mutation({
    args: { anonymousId: v.string() },
    handler: async (ctx, args) => {
        const { anonymousId } = args;
        const now = Date.now();

        // Look up existing session
        const existing = await ctx.db
            .query('sessions')
            .withIndex('by_anonymous_id', (q) => q.eq('anonymousId', anonymousId))
            .first();

        if (existing) {
            // Update last active timestamp
            await ctx.db.patch(existing._id, { lastActive: now });
            return existing._id;
        } else {
            // Create new session
            return await ctx.db.insert('sessions', {
                anonymousId,
                createdAt: now,
                lastActive: now,
                actions: []
            });
        }
    }
});

/**
 * Track a specific user action with optional metadata.
 * Use this to record important user interactions in your application.
 * 
 * @example
 * ```typescript
 * const trackAction = useMutation(api.sessions.trackUserAction);
 * 
 * // Basic usage
 * trackAction({ 
 *   anonymousId: "user123",
 *   action: "button_click"
 * });
 * 
 * // With metadata
 * trackAction({
 *   anonymousId: "user123",
 *   action: "form_submit",
 *   resourceId: "contact-form",
 *   metadata: { 
 *     formData: { email: "user@example.com" },
 *     success: true
 *   }
 * });
 * ```
 */
export const trackUserAction = mutation({
    args: {
        anonymousId: v.string(),
        action: v.string(),
        resourceId: v.optional(v.string()),
        metadata: v.optional(v.any())
    },
    handler: async (ctx, args) => {
        const { anonymousId, action, resourceId, metadata } = args;
        const now = Date.now();

        // Find the session
        const session = await ctx.db
            .query('sessions')
            .withIndex('by_anonymous_id', (q) => q.eq('anonymousId', anonymousId))
            .first();

        if (!session) {
            throw new Error('Session not found');
        }

        // Track the action
        await ctx.db.patch(session._id, {
            lastActive: now,
            actions: [...session.actions, {
                action,
                timestamp: now,
                resourceId,
                metadata
            }]
        });
    }
});

/**
 * Query active sessions within a specified time window.
 * Useful for monitoring current site activity or generating analytics.
 * 
 * @example
 * ```typescript
 * const activeSessions = useQuery(api.sessions.getActiveSessions);
 * 
 * // Get sessions active in last 30 minutes
 * const sessions = useQuery(api.sessions.getActiveSessions, { minutesActive: 30 });
 * ```
 */
export const getActiveSessions = query({
    args: {
        minutesActive: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { minutesActive = 15 } = args;

        const cutoff = Date.now() - (minutesActive * 60 * 1000);

        return await ctx.db
            .query('sessions')
            .filter((q) => q.gt(q.field('lastActive'), cutoff))
            .collect();
    }
});

/**
 * Common implementation for cleaning up old sessions.
 * This is used by both the public mutation and internal cron job.
 */
const cleanupSessionsHandler = async (ctx: MutationCtx, args: { daysInactive: number }) => {
    const { daysInactive = 30 } = args;

    // Calculate the cutoff date
    const cutoff = Date.now() - (daysInactive * 24 * 60 * 60 * 1000);

    // Find sessions older than the cutoff date
    const oldSessions = await ctx.db
        .query('sessions')
        .filter((q) => q.lt(q.field('lastActive'), cutoff))
        .collect();

    // Delete each old session
    let deletedCount = 0;
    for (const session of oldSessions) {
        await ctx.db.delete(session._id);
        deletedCount++;
    }

    return {
        deletedCount,
        oldestDate: cutoff,
    };
};

/**
 * Manually trigger cleanup of old sessions.
 * Sessions that haven't been active for the specified number of days will be removed.
 * 
 * @example
 * ```typescript
 * const cleanup = useMutation(api.sessions.cleanupOldSessions);
 * 
 * // Remove sessions inactive for 60 days
 * cleanup({ daysInactive: 60 });
 * ```
 */
export const cleanupOldSessions = mutation({
    args: {
        daysInactive: v.optional(v.number()),
    },
    handler: cleanupSessionsHandler
});

/**
 * Internal mutation for automated cleanup via cron job.
 * This is called automatically by the daily cron job.
 * You shouldn't need to call this directly.
 */
export const cleanupOldSessions_internal = internalMutation({
    args: {
        daysInactive: v.optional(v.number()),
    },
    handler: cleanupSessionsHandler
}); 