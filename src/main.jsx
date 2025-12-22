import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { clearUserCache } from "./services/api.js";
import "./index.css";

// Make clearUserCache available globally for AuthContext
if (typeof window !== 'undefined') {
  window.clearUserCache = clearUserCache;
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

