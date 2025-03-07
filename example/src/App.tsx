import { ConvexProvider, ConvexReactClient } from "convex/react";
import { SessionTracker, useSessionTracker } from "../../src/client";
import { api } from "../../src/component/_generated/api";
import { useMutation } from "convex/react";

const NEXT_PUBLIC_CONVEX_URL = "<YOUR CONVEX CLOUD URL>"

const convex = new ConvexReactClient(NEXT_PUBLIC_CONVEX_URL); 

function ExampleComponent() {
  const anonymousId = useSessionTracker() as string;
  const trackAction = useMutation(api.sessions.trackUserAction);

  const handleClick = () => {
    trackAction({
      anonymousId,
      action: "example_button_click",
      metadata: { component: "ExampleComponent" }
    });
  };

  return (
    <div>
      <h2>Example Component</h2>
      <p>Anonymous ID: {anonymousId}</p>
      <button onClick={handleClick}>Track Click</button>
    </div>
  );
}

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <div>
        <h1>Session Tracker Example</h1>
        <SessionTracker 
          heartbeatInterval={300000} // 5 minutes
          storageKey="exampleAppAnonymousId"
        />
        <ExampleComponent />
      </div>
    </ConvexProvider>
  );
} 