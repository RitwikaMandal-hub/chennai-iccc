// In DEMO_MODE, answer the app's API calls from the in-browser simulation
// instead of the network. Any other request (map tiles, fonts) passes through.

import { handleRequest } from "./demoEngine";

const DEMO_PATHS = /^\/(api\/|agent|ask|approval|execution-state|health)/;

export function installDemoFetch() {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const raw = typeof input === "string" ? input : input.url;

    if (!DEMO_PATHS.test(raw)) {
      return nativeFetch(input, init);
    }

    // Small delay so loading states are visible, like a real network.
    await new Promise((resolve) => setTimeout(resolve, raw.startsWith("/agent") ? 900 : 120));

    const body = handleRequest(raw);

    return new Response(JSON.stringify(body ?? { error: "Not found" }), {
      status: body ? 200 : 404,
      headers: { "Content-Type": "application/json" },
    });
  };
}
