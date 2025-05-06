/**
 * Elux Client-Side Runtime
 * Handles client-side rendering and hydration
 */

import { print, printError } from "../core/utils";
import { mount } from "./renderer";
import { initHistory, setupLinkHandling } from "./fileRouter";

// Store for client initialization state
let isInitialized = false;

// Store for component hydration
const hydratedComponents = new Set<string>();

/**
 * Initialize Elux client runtime
 */
export function initClient() {
  if (isInitialized || typeof window === "undefined") {
    return;
  }

  print("Initializing Elux client runtime");

  // Initialize history-based routing
  initHistory();

  // Set up link click handling
  setupLinkHandling();

  // Add the client component hydration
  setupClientComponentHydration();

  // Mark as initialized
  isInitialized = true;
}

/**
 * Handle client component hydration
 */
function setupClientComponentHydration() {
  try {
    // Dynamically import the components API to avoid circular deps
    import("../core/components")
      .then((components) => {
        const { markComponentHydrated, isClient } = components;

        if (!isClient) {
          return; // Skip if not client environment
        }

        // Find all client component placeholders
        const placeholders = document.querySelectorAll(
          '[data-elux-component="client"]'
        );
        print(`Found ${placeholders.length} client component placeholders`);

        placeholders.forEach((placeholder) => {
          const componentId = placeholder.getAttribute("data-component-id");
          if (componentId && !hydratedComponents.has(componentId)) {
            const componentName =
              placeholder.getAttribute("data-component-name") || "Unknown";
            print(
              `Hydrating client component: ${componentName} (${componentId})`
            );

            // The component has already been rendered as a placeholder server-side
            // Just mark it as hydrated so it can respond to state changes
            hydratedComponents.add(componentId);

            // We'll rely on the runtime to dynamically import and re-render the component
            // when state changes occur rather than explicit hydration
          }
        });

        // Listen for new components that might be added during navigation
        observeNewClientComponents();
      })
      .catch((err) => {
        printError("Error setting up component hydration:", err);
      });
  } catch (error) {
    printError("Error in component hydration setup:", error);
  }
}

/**
 * Observe DOM for new client components that might appear during navigation
 */
function observeNewClientComponents() {
  if (typeof MutationObserver === "undefined") {
    return;
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const placeholders = [
              ...element.querySelectorAll('[data-elux-component="client"]'),
            ];

            if (
              element.matches &&
              element.matches('[data-elux-component="client"]')
            ) {
              placeholders.push(element);
            }

            placeholders.forEach((placeholder) => {
              const componentId = placeholder.getAttribute("data-component-id");
              if (componentId && !hydratedComponents.has(componentId)) {
                hydratedComponents.add(componentId);
                print(`Observed new client component: ${componentId}`);
                // Component will be rendered when a state change occurs
              }
            });
          }
        });
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Hydrate the document with server-rendered content
 */
export function hydrateDocument(
  element: Element | null = null,
  callback?: () => void
): void {
  if (!element && typeof document !== "undefined") {
    element = document.getElementById("root");
  }

  if (element) {
    try {
      print("Hydrating client from server-rendered content");
      // Skip full hydration for simplified version

      // Hydrate client components
      setupClientComponentHydration();

      if (callback) {
        callback();
      }
    } catch (error) {
      printError("Error during hydration:", error);
      print("Falling back to client-side render");
      element.innerHTML = "";
      renderApp(element);
    }
  } else {
    printError("No target element found for hydration/rendering");
  }
}

/**
 * Render the app from scratch
 */
export function renderApp(element: Element | null = null): void {
  if (!element && typeof document !== "undefined") {
    element = document.getElementById("root");
  }

  if (element) {
    try {
      print("Rendering client app");
      // Add a placeholder that can be filled by the router
      element.innerHTML = '<div id="app-content"></div>';

      // Set up client components
      setupClientComponentHydration();
    } catch (error) {
      printError("Error during render:", error);
    }
  } else {
    printError("No target element found for rendering");
  }
}

// Auto-initialize on module load
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initClient);
  } else {
    initClient();
  }
}
