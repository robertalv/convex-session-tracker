import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Schema for the anonymous session tracking system.
 * This schema defines the structure of the sessions table used to track anonymous users.
 * Timestamps are stored in milliseconds since epoch for easy querying (convex default).
 * 
 * The sessions table includes:
 * - anonymousId: A unique identifier for each anonymous user
 * - createdAt: When the session was first created (milliseconds since epoch)
 * - lastActive: Last time the user was seen active (milliseconds since epoch)
 * - actions: Array of user actions with timestamps and metadata
 * 
 * Usage:
 * ```typescript
 * import { defineSchema } from "convex/server";
 * import { sessionSchema } from "@devwithbobby/anonymous-tracker";
 * 
 * export default defineSchema({
 *   ...sessionSchema,
 *   // Your other tables here
 * });
 * ```
 */
const schema = defineSchema({
  /**
   * Sessions table for tracking anonymous user activity
   * Indexed by anonymousId for efficient lookups
   */
  sessions: defineTable({
    // Unique identifier for the anonymous user
    anonymousId: v.string(),
    // Timestamp in milliseconds since epoch when the session was created
    createdAt: v.number(),
    // Timestamp in milliseconds since epoch of the last activity
    lastActive: v.number(),
    // Array of user actions
    actions: v.array(v.object({
      // Type of action performed (e.g., "page_view", "button_click")
      action: v.string(),
      // Timestamp in milliseconds since epoch when the action occurred
      timestamp: v.number(),
      // Optional identifier for the resource being acted upon
      resourceId: v.optional(v.string()),
      // Optional additional data about the action
      metadata: v.optional(v.any())
    }))
  }).index("by_anonymous_id", ["anonymousId"])
}); 

export default schema;