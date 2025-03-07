import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMutation } from 'convex/react';
import { api } from '../component/_generated/api';

/**
 * Configuration options for the session tracker
 */
export interface SessionTrackerProps {
  /**
   * Time in milliseconds between session heartbeats
   * @default 300000 (5 minutes)
   */
  heartbeatInterval?: number;

  /**
   * LocalStorage key for storing the anonymous user ID
   * @default 'anonymousUserId'
   */
  storageKey?: string;
}

/**
 * React hook for tracking anonymous user sessions.
 * Returns the anonymous ID that can be used for tracking specific actions.
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const anonymousId = useSessionTracker();
 * 
 * // With custom configuration
 * const anonymousId = useSessionTracker({
 *   heartbeatInterval: 60000, // 1 minute
 *   storageKey: 'myAppUserId'
 * });
 * 
 * // Use with action tracking
 * const trackAction = useMutation(api.sessions.trackUserAction);
 * 
 * const handleClick = () => {
 *   trackAction({
 *     anonymousId,
 *     action: "button_click",
 *     metadata: { buttonId: "submit" }
 *   });
 * };
 * ```
 */
export const useSessionTracker = ({
  heartbeatInterval = 5 * 60 * 1000, // 5 minutes default
  storageKey = 'anonymousUserId'
}: SessionTrackerProps = {}) => {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const trackSession = useMutation(api.sessions.trackSession);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Get existing ID or create a new one
    const storedId = localStorage.getItem(storageKey);
    const id = storedId || uuidv4();

    if (!storedId) {
      localStorage.setItem(storageKey, id);
    }

    setAnonymousId(id);

    // Track this session in Convex
    trackSession({ anonymousId: id });

    // Set up a heartbeat to track active sessions
    const interval = setInterval(() => {
      trackSession({ anonymousId: id });
    }, heartbeatInterval);

    return () => clearInterval(interval);
  }, [trackSession, heartbeatInterval, storageKey]);

  return anonymousId;
};

export const SessionTracker: React.FC<SessionTrackerProps> = (props) => {
  useSessionTracker(props);
  return null;
}; 

/**
 * React component for tracking anonymous user sessions.
 * This component should be placed near the root of your app.
 * 
 * @example
 * ```typescript
 * // Basic usage
 * function App() {
 *   return (
 *     <>
 *       <SessionTracker />
 *       ...Your app content here
 *     </>
 *   );
 * }
 * 
 * // With custom configuration
 * function App() {
 *   return (
 *     <>
 *       <SessionTracker 
 *         heartbeatInterval={60000} // 1 minute
 *         storageKey="myAppUserId"
 *       />
 *       ...Your app content here
 *     </>
 *   );
 * }
 * ```
 */
