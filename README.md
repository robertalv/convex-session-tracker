# Convex Session Tracker

[![npm version](https://badge.fury.io/js/%40devwithbobby%2Fconvex-session-tracker.svg)](https://badge.fury.io/js/%40devwithbobby%2Fconvex-session-tracker)

A simple and efficient way to track anonymous user sessions in your Convex applications.

## Features

- Anonymous session tracking with unique IDs
- Automatic session heartbeat to track active users
- User action tracking with metadata
- Configurable cleanup of old sessions
- Built-in cron job for maintenance
- TypeScript support

## Installation

```bash
npm install @devwithbobby/convex-session-tracker
```

## Setup

Add the sessions table to your Convex schema

```typescript
import { defineSchema, defineTable } from "convex/server";

export default defineSchema({
  sessions: defineTable({
    anonymousId: v.string(),
    createdAt: v.number(),
    lastActive: v.number(),
    actions: v.array(v.object({
      action: v.string(),
      timestamp: v.number(),
      resourceId: v.optional(v.string()),
      metadata: v.optional(v.any())
    }))
  }).index("by_anonymous_id", ["anonymousId"])
});
```

Create a `convex.config.ts` file in your app's `convex/` folder and define the `sessionTracker` component:
```
// convex/convex.config.ts
import { defineComponent } from "convex/server";

export default defineComponent("sessionTracker");
```

Create a `sessions.ts` file in your app's `convex/` folder and add the following functions:

```typescript
// convex/sessions.ts
import { mutation, query, internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

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
export const trackSession = mutation({
    args: { anonymousId: v.string() },
    handler: async (ctx, args) => {
        const { anonymousId } = args;
        const now = Date.now();

        const existing = await ctx.db
            .query('sessions')
            .withIndex('by_anonymous_id', (q) => q.eq('anonymousId', anonymousId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { lastActive: now });
            return existing._id;
        } else {
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

// ... Add other functions from sessions.ts ...
```

(Optional) Create a `crons.ts` file in your app's `convex/` folder to set up the cleanup job:

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run sessions cleanup daily at 2:30 AM UTC
crons.daily(
  "cleanup-old-sessions",
  { hourUTC: 2, minuteUTC: 30 },
  internal.sessions.cleanupOldSessions_internal,
  { daysInactive: 14 }
);

export default crons;
```

# Usage
Add the `SessionTracker` component to your app

```typescript
import { SessionTracker } from "@devwithbobby/convex-session-tracker";

function App() {
  return (
    <>
      <SessionTracker />
      {/* Your app content */}
    </>
  );
}
```

# Optional
Track user actions:

- Insert a trackUserAction mutation into your `convex/sessions.ts` file:

```
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
```

- Add the `useSessionTracker` hook to your app and pass the anonymous ID to the `trackSession` mutation:

```typescript
// MyComponent.tsx
"use client";

import { useSessionTracker } from "@devwithbobby/convex-session-tracker";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function MyComponent() {
  const anonymousId = useSessionTracker();
  const trackAction = useMutation(api.sessions.trackUserAction);

  const handleClick = () => {
    trackAction({
      anonymousId,
      action: "button_click",
      metadata: { buttonId: "submit" }
    });
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

## Configuration

The `SessionTracker` component accepts the following props:

- `heartbeatInterval`: Time in milliseconds between session heartbeats (default: 5 minutes)
- `storageKey`: LocalStorage key for storing the anonymous ID (default: 'anonymousUserId')

```typescript
<SessionTracker 
  heartbeatInterval={300000} // 5 minutes
  storageKey="myAppAnonymousId"
/>
```

The `useSessionTracker` hook returns the current anonymous ID and session tracking functionality.
- `anonymousId`: The current anonymous ID
- `trackUserAction`: A mutation for tracking a user action

```typescript
const anonymousId = useSessionTracker();
const trackSession = useMutation(api.sessions.trackSession);

// Track a new session
trackAction({
  anonymousId,
  action: "button_click",
  metadata: { buttonId: "submit" }
});
```

Extra functionality:
- `getActiveSessions`: A query for retrieving active sessions
- `cleanupOldSessions`: A mutation for manually triggering session cleanup

```typescript
const getActiveSessions = useQuery(api.sessions.getActiveSessions);
const cleanupOldSessions = useMutation(api.sessions.cleanupOldSessions);
```

## API Reference

### Components

#### `SessionTracker`
A React component that manages anonymous session tracking.

#### `useSessionTracker`
A React hook that provides access to the current anonymous ID and session tracking functionality.

### Convex Functions

#### `trackSession`
Tracks a session heartbeat.

#### `trackUserAction`
Records a user action with optional metadata.

#### `getActiveSessions`
Retrieves currently active sessions.

#### `cleanupOldSessions`
Manually triggers cleanup of old sessions.

## License

Apache-2.0
