import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { clearUserCache } from "./services/api.js";
import "./index.css";

// Make clearUserCache available globally for AuthContext
if (typeof window !== 'undefined') {
  window.clearUserCache = clearUserCache;
  
  // Suppress harmless browser extension errors (Trust Wallet, MetaMask, Solana, etc.)
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    const errorMessage = args.join(' ').toLowerCase();
    const errorStack = args.find(arg => typeof arg === 'string' && arg.includes('inpage.js')) || '';
    
    // Filter out browser extension errors that are harmless
    if (
      errorMessage.includes('in_page_channel_node_id') ||
      errorMessage.includes('in-page-channel-node-id') ||
      errorMessage.includes('inpage.js') ||
      errorMessage.includes('trust wallet') ||
      errorMessage.includes('metamask') ||
      errorMessage.includes('wallet extension') ||
      errorMessage.includes('solana') ||
      errorMessage.includes('chrome-extension://') ||
      errorMessage.includes('moz-extension://') ||
      errorMessage.includes('extension context invalidated') ||
      errorMessage.includes('broadcastmessage') ||
      errorMessage.includes('initbroadcastmessage') ||
      errorStack.includes('inpage.js')
    ) {
      // Silently ignore these extension errors
      return;
    }
    // Log all other errors normally
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const warnMessage = args.join(' ').toLowerCase();
    const warnStack = args.find(arg => typeof arg === 'string' && arg.includes('inpage.js')) || '';
    
    // Filter out browser extension warnings
    if (
      warnMessage.includes('solana') ||
      warnMessage.includes('chrome-extension://') ||
      warnMessage.includes('moz-extension://') ||
      warnMessage.includes('inpage.js') ||
      warnMessage.includes('in_page_channel_node_id') ||
      warnMessage.includes('in-page-channel-node-id') ||
      warnStack.includes('inpage.js')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

