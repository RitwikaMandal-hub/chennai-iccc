// Central service configuration.
//
// Local development: frontend/.env.development points these at the
// Node backend (5000) and the Python AI service (8100).
//
// Public deployment (GitHub Pages): no backend exists, so the URLs are
// left empty and DEMO_MODE turns on. The app then runs against the
// in-browser simulation in ./demoEngine.js, so anyone with the link
// sees a fully working command centre.

const env = import.meta.env;

export const DEMO_MODE =
  env.VITE_DEMO_MODE === "true" || !env.VITE_API_URL;

export const API_URL = DEMO_MODE ? "" : env.VITE_API_URL;
export const AI_URL = DEMO_MODE ? "" : env.VITE_AI_URL || "";
export const SOCKET_URL = DEMO_MODE ? "" : env.VITE_SOCKET_URL || env.VITE_API_URL;
