import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";
import App from "./App.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner";
import registerServiceWorker from "./serviceWorkerRegistration.js";

const queryClient = new QueryClient()

// Initialize theme from localStorage or system preference
try {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') document.documentElement.classList.add('dark');
  else if (saved === 'light') document.documentElement.classList.remove('dark');
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
} catch {
  // Ignore theme initialization failures and fall back to the default theme.
}

// Register service worker
registerServiceWorker();

// Handle chunk loading errors (Vite dynamic import failures)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected:', event);
  toast.error('A newer version is available, but the page will stay stable. Refresh when convenient.');
  event.preventDefault();
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
