/** @jsx h */
/**
 * Elux Framework - Runtime
 * Main entry point for the client-side framework
 */

import { h, render } from "./core/vdom";
import { router } from "./core/router";
import { createStore } from "./core/signals";
import { initElux } from "./core/index";

// Import auto-generated routes
import { routes } from "./routes";

// Global state for the application
interface AppState {
  isLoading: boolean;
  error: Error | null;
  currentPath: string;
  params: Record<string, string>;
  count?: number; // Add count to the AppState interface
}

const appState = createStore<AppState>({
  isLoading: false,
  error: null as Error | null,
  currentPath: typeof window !== "undefined" ? window.location.pathname : "/",
  params: {} as Record<string, string>,
  count: 0, // Initialize count in the state
});

// UI Components
const LoadingIndicator = () => (
  <div className="loading">
    <div className="spinner"></div>
    <p>Loading...</p>
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

  console.log("[Runtime] Initializing application");

  // Get the app container
  const container = document.getElementById("app");
  if (!container) {
    console.error("[Runtime] App container not found");
    return;
  }

  // Add a global event handler for counter updates
  setupCounterUpdateHandler();

  // Load routes into the router
  router.loadRoutes(routes);

  // Function to render the current route
  async function renderRoute() {
    // Update state
    appState.setState({ isLoading: true, error: null });

    // Show loading indicator
    if (container) {
      render(<LoadingIndicator />, container);
    }

    try {
      // Get the current path
      const path = router.getCurrentPath();
      console.log(`[Runtime] Rendering route: ${path}`);

      // Match the route
      const { route, params } = router.match(path);

      // Update state with params
      appState.setState({ params });

      // Load the component
      const module = await route.loader();
      const Page = module.default;

      if (!Page) {
        throw new Error(`Component not found for route: ${path}`);
      }

      // Render the page
      if (container) {
        render(<Page params={params} />, container);
      }

      // Update state
      appState.setState({ isLoading: false, currentPath: path });

      console.log(`[Runtime] Route rendered: ${path}`);
    } catch (error) {
      console.error("[Runtime] Error rendering route:", error);

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
    renderRoute();
  });

  // Set up Link component - exported for use in applications
  window.EluxLink = (props: {
    href: string;
    children: any;
    className?: string;
    [key: string]: any;
  }) => {
    const { href, children, className, ...rest } = props;

    const handleClick = (e: MouseEvent) => {
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

      // Navigate using the router
      router.navigate(href);
    };

    return (
      <a href={href} className={className} onClick={handleClick} {...rest}>
        {children}
      </a>
    );
  };

  // Initial render
  renderRoute();
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

  console.log("[Runtime] Counter update handler initialized");
}

// Initialize when the DOM is ready
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}

// Define global interface
declare global {
  interface Window {
    EluxLink: (props: {
      href: string;
      children: any;
      className?: string;
      [key: string]: any;
    }) => Element;
    updateCounterDisplay: (value: number) => void;
  }
}
