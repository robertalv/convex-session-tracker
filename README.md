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

## Usage

1. First, add the sessions table to your Convex schema

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

2. Add the session tracker component to your app

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

3. (Optional) Track user actions:

```typescript
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
