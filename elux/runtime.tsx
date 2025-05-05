/** @jsx h */
/**
 * Elux Framework - Runtime
 * Main entry point for the client-side framework
 */

import { h, render } from "./core/vdom";
import { router } from "./core/router";
import { createStore } from "./core/signals";
import { initElux } from "./core/index";
import { print, printError } from "./core/utils";

// Add HMR support
const HMR_ENABLED = process.env.NODE_ENV !== "production";
const HMR_DEBUG = false; // Set to true to show HMR debug panel

// Import auto-generated routes
import { routes } from "./routes";

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
  count?: number; // Add count to the AppState interface
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

// UI Components
const LoadingIndicator = () => (
  <div className="loading">
    <div className="spinner"></div>
    <p>Booting...</p>
  </div>
);

const ErrorDisplay = ({ error }: { error: Error }) => (
  <div className="error-container">
    <h2>Error</h2>
    <p>{error.message}</p>
    <pre>{error.stack}</pre>
    <button onClick={() => window.location.reload()}>Reload</button>
  </div>
);

// Initialize the app
async function initApp() {
  // Initialize the framework
  initElux();

  print("Initializing application");

  // Get the app container
  const container = document.getElementById("app");
  if (!container) {
    printError("App container not found");
    return;
  }

  // Add a global event handler for counter updates
  setupCounterUpdateHandler();

  // Load routes into the router
  router.loadRoutes(routes);

  // Setup HMR for development
  if (HMR_ENABLED) {
    setupHotModuleReplacement();
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

      if (hasNewRoutes) {
        print("New routes detected, reloading page to update...");
        // Force reload to get new routes.ts
        window.location.reload();
      }

      return !hasNewRoutes;
    } catch (error) {
      printError("Error refreshing routes:", error);
      return false;
    }
  }

  // Check for route updates every 5 seconds in development
  if (process.env.NODE_ENV !== "production") {
    setInterval(refreshRoutes, 5000);
  }

  // Add route refresh to window for debugging
  window.refreshEluxRoutes = refreshRoutes;

  // Function to render the current route
  async function renderRoute(isInitialLoad = false) {
    try {
      // Get the current path
      const path = router.getCurrentPath();
      print(`Rendering route: ${path}`);

      // If this is a new route, first check if routes have been updated
      if (!isInitialLoad) {
        try {
          // Before navigating to a path, check if we have that route
          // If not, try to refresh routes from server
          if (!Object.keys(routes).includes(path)) {
            await refreshRoutes();
          }
        } catch (e) {
          // Ignore refresh errors and continue with navigation
        }
      }

      // Match the route
      const { route, params } = router.match(path);

      // On initial load with server rendering, don't show loading indicator
      if (!isInitialLoad) {
        // Update state
        appState.setState({ isLoading: true, error: null });

        // Show loading indicator
        if (container) {
          render(<LoadingIndicator />, container);
        }
      }

      // Update state with params
      appState.setState({ params });

      // Load the component
      const module = await route.loader();
      const Page = module.default;

      if (!Page) {
        throw new Error(`Component not found for route: ${path}`);
      }

      // Check for server-side hydration
      const shouldHydrate =
        isInitialLoad &&
        container &&
        container.innerHTML &&
        container.innerHTML.trim() !== "";

      // When hydrating on initial load with SSR, use the props from __INITIAL_DATA__
      const props = shouldHydrate ? initialData : { params };

      // Log hydration status
      if (shouldHydrate) {
        print("Hydrating existing server-rendered HTML");
      }

      // Render the page
      if (container) {
        try {
          render(<Page {...props} />, container);
        } catch (renderError) {
          printError("Error rendering component:", renderError);
          render(
            <ErrorDisplay
              error={
                renderError instanceof Error
                  ? renderError
                  : new Error(String(renderError))
              }
            />,
            container
          );
        }
      }

      // Update state
      appState.setState({ isLoading: false, currentPath: path });

      print(`Route rendered: ${path}`);
    } catch (error) {
      printError("Error rendering route:", error);

      // Update state
      appState.setState({
        error: error instanceof Error ? error : new Error(String(error)),
        isLoading: false,
      });

      // Render error
      if (container) {
        render(<ErrorDisplay error={appState.get("error")!} />, container);
      }
    }
  }

  // Subscribe to router changes
  router.subscribe(() => {
    renderRoute(false);
  });

  // Set up Link component - exported for use in applications
  (window as any).EluxLink = (props: {
    href: string;
    children: any;
    className?: string | undefined;
    [key: string]: any;
  }) => {
    const { href, children, className, ...rest } = props;

    const handleClick = async (e: MouseEvent) => {
      // Skip navigation for external links or modified clicks
      if (
        href.startsWith("http") ||
        href.startsWith("//") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      ) {
        return;
      }

      // Prevent default browser navigation
      e.preventDefault();

      // Check if the route exists or if we need to refresh
      const normalizedPath = href.startsWith("/") ? href : `/${href}`;
      if (!Object.keys(routes).includes(normalizedPath)) {
        try {
          // Try to refresh routes before navigation
          const refreshed = await refreshRoutes();
          if (!refreshed) {
            print(
              `Route not found: ${normalizedPath}, but continuing anyway...`
            );
          }
        } catch (error) {
          printError("Error checking routes:", error);
        }
      }

      // Navigate using the router
      router.navigate(href);
    };

    return (
      <a href={href} className={className} onClick={handleClick} {...rest}>
        {children}
      </a>
    );
  };

  // Initial render - pass true to indicate this is the initial load
  renderRoute(true);
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
    const debugConsole = document.getElementById('debug-panel');
    if (debugConsole) {
      const line = document.createElement('p');
      line.className = 'debug-log';
      line.innerHTML = `<span style="color:#00aaff">[HMR]</span> ${message}`;
      debugConsole.appendChild(line);
      debugConsole.scrollTop = debugConsole.scrollHeight;
    }
  };
  
  // Listen for Vite's HMR events
  // @ts-ignore - Vite HMR API
  if (import.meta.hot) {
    // @ts-ignore - Vite HMR API
    import.meta.hot.accept(() => {
      debugHmr("Hot module update detected, refreshing...");
      router.navigate(router.getCurrentPath());
    });
  }
  
  // Listen for server-sent custom events
  const eventSource = new EventSource('/__elux-hmr');
  
  eventSource.addEventListener('open', () => {
    debugHmr("HMR connection established");
  });
  
  eventSource.addEventListener('elux:file-change', (event) => {
    try {
      const data = JSON.parse(event.data);
      debugHmr(`File changed: ${data.file}, refreshing...`);
      // Re-render the current route
      router.navigate(router.getCurrentPath());
    } catch (error) {
      printError("Error handling HMR event:", error);
      debugHmr(`Error: ${error}`);
    }
  });
  
  eventSource.addEventListener('error', () => {
    debugHmr("HMR connection error, retrying...");
    // Will automatically try to reconnect
  });
  
  // Add to window for debugging
  window.eluxHMR = {
    refresh: () => router.navigate(router.getCurrentPath()),
    eventSource,
    forceRefresh: () => window.location.reload()
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
      eventSource: EventSource;
      forceRefresh: () => void;
    };
  }
}

// Initialize when the DOM is ready
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}
