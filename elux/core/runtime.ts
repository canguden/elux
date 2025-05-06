/** @jsx h */
/**
 * Elux Framework - Runtime
 * Main entry point for the client-side framework
 */

import { createStore } from "./signals";
import { print, printError } from "./utils";
import { initRouter } from "../client/fileRouter";

// Import auto-generated routes
import { routes } from "../routes";

// Type definition for Vite's HMR API
declare interface ImportMeta {
  hot?: {
    accept(callback?: (modules: any) => void): void;
    dispose(callback: (data: any) => void): void;
  };
}

// Global state for the application
interface AppState {
  isLoading: boolean;
  error: Error | null;
  currentPath: string;
  params: Record<string, string>;
  count?: number;
}

/**
 * Initialize the Elux application
 * @param options Configuration options
 */
export function initElux(options: {
  appRoot?: string;
  initialState?: Record<string, any>;
}) {
  const { appRoot = "#app", initialState = {} } = options;

  // Create the global store
  createStore(initialState);

  // Initialize the router
  if (typeof window !== "undefined") {
    print("[Elux] Initializing client runtime");

    // Make sure DOM is loaded before initializing router
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        initRouter(appRoot);
      });
    } else {
      // DOM already loaded, initialize immediately
      initRouter(appRoot);
    }

    print("[Elux] Client runtime initialized");
  }

  return {
    appRoot,
    state: initialState,
  };
}

// Get initial data from server if available
const initialData =
  typeof window !== "undefined" && window.__INITIAL_DATA__
    ? window.__INITIAL_DATA__
    : {};

// Initialize app state with data from server if available
const appState = createStore<AppState>({
  isLoading: false,
  error: null as Error | null,
  currentPath: typeof window !== "undefined" ? window.location.pathname : "/",
  params: {} as Record<string, string>,
  count: 0,
  ...initialData, // Merge initial data from server
});

// Initialize the app
async function initApp() {
  // Initialize the framework
  initElux({
    appRoot: "#app",
    initialState: initialData,
  });

  print("Initializing application");

  // Get the app container
  const container = document.getElementById("app");
  if (!container) {
    printError("App container not found");
    return;
  }

  // Add a global event handler for counter updates
  setupCounterUpdateHandler();

  // Initialize the file-based router
  try {
    print("Initializing file-based router");
    initRouter("#app");
    print("Router initialized successfully");
  } catch (error) {
    printError("Error initializing router:", error);

    // Show error in container
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; margin: 20px; border: 1px solid #f44336; border-radius: 4px;">
          <h1 style="color: #f44336;">Router Initialization Error</h1>
          <p>${error instanceof Error ? error.message : String(error)}</p>
          <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${
            error instanceof Error ? error.stack : ""
          }</pre>
        </div>
      `;
    }
  }

  // Function to fetch latest routes from server
  async function refreshRoutes() {
    try {
      const response = await fetch("/__elux/api/routes");
      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const data = await response.json();
      const serverRoutes = data.routes as string[];

      // Get current client routes
      const clientRoutes = Object.keys(routes);

      // Check if we have new routes
      const hasNewRoutes = serverRoutes.some(
        (route) => !clientRoutes.includes(route)
      );

      // Check if we have removed routes
      const hasRemovedRoutes = clientRoutes.some(
        (route) => !serverRoutes.includes(route) && route !== "*"
      );

      // If routes have changed, we should reload to get the updated routes.ts
      if (hasNewRoutes || hasRemovedRoutes) {
        print("Routes have changed, reloading page to update...");
        // Force reload to get new routes.ts
        window.location.reload();
        return true;
      }

      return !hasNewRoutes;
    } catch (error) {
      // Fail silently in production
      if (process.env.NODE_ENV !== "production") {
        printError("Error refreshing routes:", error);
      }
      return false;
    }
  }

  // Check for route updates in development mode
  if (process.env.NODE_ENV !== "production") {
    // Temporarily disable automatic route refreshing as it's causing too frequent refreshes
    // setInterval(refreshRoutes, 10000); // Check every 10 seconds
    print("[Elux] Automatic route refreshing is disabled");
  }

  // Add route refresh to window for debugging
  window.refreshEluxRoutes = refreshRoutes;

  // Expose debug functions globally for developer use
  window.eluxDebug = {
    showPanel: () => {
      try {
        const { forceShowDebugPanel } = require("./dev");
        forceShowDebugPanel();
      } catch (e) {
        console.error("[Elux] Failed to show debug panel:", e);
      }
    },
  };
}

// Setup global counter update handler
function setupCounterUpdateHandler() {
  // Define a custom event to handle counter updates
  window.addEventListener("counter-updated", (e: any) => {
    const newValue = e.detail?.value;
    if (typeof newValue === "number") {
      // Find and update all counter elements in the DOM
      const counterElements = document.querySelectorAll(
        ".text-primary.text-lg.font-bold"
      );
      counterElements.forEach((element) => {
        if (element.textContent && element.textContent.includes("Count:")) {
          // Update the counter text directly
          const label = element.textContent.split(":")[0];
          element.textContent = `${label}: ${newValue}`;
        }
      });
    }
  });

  // Add a global helper function to dispatch counter update events
  window.updateCounterDisplay = (value: number) => {
    // Update state
    appState.setState({ count: value });

    // Dispatch event for DOM updates
    window.dispatchEvent(
      new CustomEvent("counter-updated", {
        detail: { value },
      })
    );
  };

  // Patch the setState method to handle counter updates
  const originalSetState = appState.setState;
  appState.setState = function (update: any) {
    originalSetState.call(this, update);

    // If count is being updated, trigger DOM updates
    if (update.count !== undefined) {
      window.dispatchEvent(
        new CustomEvent("counter-updated", {
          detail: { value: update.count },
        })
      );
    }
  };

  print("Counter update handler initialized");
}

// Setup Hot Module Replacement
function setupHotModuleReplacement() {
  print("Setting up HMR listeners");

  // Create debug panel for developer experience
  const debugHmr = (message: string) => {
    print(`[HMR] ${message}`);
    // Add to debug console if exists
    const debugConsole = document.getElementById("debug-panel");
    if (debugConsole) {
      const line = document.createElement("p");
      line.className = "debug-log";
      line.innerHTML = `<span style="color:#00aaff">[HMR]</span> ${message}`;
      debugConsole.appendChild(line);
      debugConsole.scrollTop = debugConsole.scrollHeight;
    }
  };

  // Listen for Vite's HMR events
  // @ts-ignore - Vite HMR API
  if (import.meta.hot) {
    debugHmr("HMR enabled");

    // @ts-ignore - Vite HMR API
    import.meta.hot.accept(() => {
      debugHmr("Hot module update detected, refreshing...");
      window.location.reload(); // Force full page reload to get new routes
    });
  } else {
    debugHmr("HMR not available - page will reload on changes");
  }

  // Add to window for debugging and manual refreshing
  window.eluxHMR = {
    refresh: () => window.location.reload(),
    forceRefresh: () => window.location.reload(),
  };

  debugHmr("HMR setup complete");
}

// Add debug tools to global interface
declare global {
  interface Window {
    __INITIAL_DATA__?: Record<string, any>;
    updateCounterDisplay: (value: number) => void;
    refreshEluxRoutes: () => Promise<boolean>;
    eluxHMR: {
      refresh: () => void;
      forceRefresh: () => void;
    };
    eluxDebug: {
      showPanel: () => void;
    };
  }
}

// Initialize when the DOM is ready
if (typeof window !== "undefined") {
  // Set up HMR for development
  if (process.env.NODE_ENV !== "production") {
    setupHotModuleReplacement();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}
