import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { DEMO_MODE } from "./lib/config";
import { installDemoFetch } from "./lib/demoFetch";

if (DEMO_MODE) {
  installDemoFetch();
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
