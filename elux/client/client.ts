// Client entry point
import { h, mount } from "./renderer";
import { initRouter } from "./fileRouter";
import { hydrateState, updateState } from "../core/context";

// Add these lines at the top of the file to create global debug function
(window as any).eluxDebug = true;
console.log("[ELUX] Debug mode enabled - Initializing client");

// Default initial state for fallback
const initialState = {
  count: 0,
  title: "Elux Framework",
  description: "A TypeScript framework from scratch — no React required!",
};

// Function to check if CSS is loaded
function checkCssLoaded() {
  console.log("[ELUX] Checking if CSS is loaded...");
  const allStylesheets = document.styleSheets;
  console.log("[ELUX] Stylesheets:", allStylesheets);

  let foundEluxStyles = false;
  for (let i = 0; i < allStylesheets.length; i++) {
    const sheet = allStylesheets[i];
    console.log("[ELUX] Stylesheet:", sheet);

    try {
      // Try to access the sheet's rules to see if it's loaded
      const rules = sheet.cssRules;
      console.log(`[ELUX] Stylesheet ${i} has ${rules.length} rules`);

      // Check if it's our stylesheet
      if (sheet.href && sheet.href.includes("globals.css")) {
        foundEluxStyles = true;
        console.log(`[ELUX] Found globals.css with ${rules.length} rules`);
      }
    } catch (e) {
      console.warn(`[ELUX] Cannot access rules for stylesheet ${i}:`, e);
    }
  }

  if (!foundEluxStyles) {
    console.error("[ELUX] Global styles not found or not loaded!");

    // Try to add styles directly as a fallback
    const style = document.createElement("style");
    style.textContent = `
      body { font-family: sans-serif; margin: 0; padding: 20px; }
      .container { max-width: 960px; margin: 0 auto; }
      .card { padding: 16px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 16px; }
      .btn { padding: 8px 16px; background: #0070f3; color: white; border-radius: 4px; text-decoration: none; display: inline-block; }
      .btn-primary { background: #0070f3; }
      .btn-outline { background: transparent; border: 1px solid #0070f3; color: #0070f3; }
      .card-default { background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .card-title { margin-top: 0; font-weight: bold; }
      .text-center { text-align: center; }
      .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
      .text-2xl { font-size: 1.5rem; }
      .font-bold { font-weight: bold; }
      .mb-2 { margin-bottom: 0.5rem; }
      .mb-4 { margin-bottom: 1rem; }
      .mt-4 { margin-top: 1rem; }
      .flex { display: flex; }
      .flex-col { flex-direction: column; }
      .justify-center { justify-content: center; }
      .items-center { align-items: center; }
      .gap-4 { gap: 1rem; }
      .grid { display: grid; }
      .grid.gap-4 { grid-gap: 1rem; }
      .text-primary { color: #0070f3; }
      .text-lg { font-size: 1.125rem; }
      .bg-accent { background-color: #6366f1; }
      .text-accent-foreground { color: white; }
      .rounded-md { border-radius: 0.375rem; }
      .bg-muted { background-color: #f1f1f1; }
      .text-sm { font-size: 0.875rem; }
      .rounded { border-radius: 0.25rem; }
      .text-muted-foreground { color: #6c757d; }
      .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
      .py-0.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
    `;
    document.head.appendChild(style);
    console.log("[ELUX] Added fallback styles");
  }
}

// Direct DOM rendering that bypasses the framework when there are issues
function renderDirectly() {
  console.log("[ELUX] Using direct DOM rendering");
  const appContainer = document.getElementById("app");

  if (!appContainer) {
    console.error("[ELUX] Could not find app container");
    return;
  }

  // Get current route for basic routing
  const route = window.location.pathname;

  // Simple HTML content based on route
  let content = "";

  if (route === "/") {
    content = `
      <div class="container">
        <header class="py-4 text-center mb-4">
          <h1 class="text-2xl font-bold mb-2">Elux Framework</h1>
          <p class="text-muted-foreground">A fully hackable TypeScript-first framework from scratch</p>
        </header>
        
        <section class="mb-4">
          <div class="card card-default mt-4 mb-4 flex flex-col items-center py-4 px-4">
            <div class="text-primary text-lg font-bold mb-4">Current Count: 0</div>
            <button class="btn btn-primary" onclick="window.incrementCount()">Increment</button>
          </div>
          
          <div class="card mt-4 py-4 px-4 bg-accent text-accent-foreground rounded-md">
            <h2 class="text-accent-foreground font-bold mb-2">Demo Component</h2>
            <p class="font-bold mb-2">THIS IS THE DEMO COMPONENT!</p>
            <p class="mb-2">This is a demo component that demonstrates components in Elux!</p>
          </div>
          
          <div class="grid gap-4 mt-4">
            <div class="card card-default">
              <h3 class="card-title">💡 Custom Render</h3>
              <p>Built with a lightweight VDOM implementation, no React needed.</p>
            </div>
            <div class="card card-default">
              <h3 class="card-title">🔥 Signal-based State</h3>
              <p>Reactive programming with fine-grained updates.</p>
            </div>
            <div class="card card-default">
              <h3 class="card-title">⚡ File-based Routing</h3>
              <p>Intuitive app directory structure.</p>
            </div>
          </div>
        </section>
        
        <div class="flex justify-center gap-4 mt-4">
          <a href="/about" class="btn btn-primary">About Us</a>
          <a href="/docs" class="btn btn-outline">Documentation</a>
        </div>
      </div>
    `;
  } else if (route === "/about") {
    content = `
      <div class="container">
        <header class="py-4 text-center mb-4">
          <h1 class="text-2xl font-bold mb-2">About Elux</h1>
          <p class="text-muted-foreground">Learn about our lightweight framework</p>
        </header>
        
        <div class="card card-default">
          <h2 class="card-title">About Our Framework</h2>
          <p>Elux is a lightweight, TypeScript-first framework built for modern web development.</p>
          <p class="mt-4">It features:</p>
          <ul class="mt-2">
            <li>Custom VDOM implementation</li>
            <li>File-based routing</li>
            <li>Signal-based state management</li>
            <li>No React dependencies</li>
          </ul>
        </div>
        
        <div class="flex justify-center gap-4 mt-4">
          <a href="/" class="btn btn-primary">Back to Home</a>
        </div>
      </div>
    `;
  } else {
    content = `
      <div class="container text-center py-4">
        <h1 class="text-2xl font-bold mb-4">404 - Page Not Found</h1>
        <p>The page ${route} does not exist.</p>
        <a href="/" class="btn btn-primary mt-4">Go Home</a>
      </div>
    `;
  }

  // Set the content
  appContainer.innerHTML = content;

  // Add counter functionality
  window.incrementCount = function () {
    const counterEl = document.querySelector(".text-primary.text-lg");
    if (counterEl) {
      const currentCount = parseInt(
        counterEl.textContent?.split(":")[1].trim() || "0"
      );
      counterEl.textContent = `Current Count: ${currentCount + 1}`;
    }
  };

  // Enable client-side navigation
  setupDirectNavigation();

  console.log("[ELUX] Direct DOM rendering complete");
}

// Setup client-side navigation for direct rendering mode
function setupDirectNavigation() {
  // Add click handlers to all internal links for SPA-like navigation
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");
    const href = link?.getAttribute("href");

    if (link && href && !href.startsWith("http")) {
      // Skip modified clicks or external targets
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        link.getAttribute("target") === "_blank"
      ) {
        return;
      }

      // Handle internal navigation
      e.preventDefault();

      // Update URL and rerender
      window.history.pushState({}, "", href);
      renderDirectly();
    }
  });

  // Handle browser back/forward
  window.addEventListener("popstate", () => {
    renderDirectly();
  });
}

// Simple function to try direct component rendering
function tryDirectComponentRender() {
  console.log("[ELUX] Trying direct component rendering");
  const appContainer = document.getElementById("app");

  if (!appContainer) {
    console.error("[ELUX] App container not found for direct component render");
    return;
  }

  try {
    // Create a simple component using the h function
    const SimpleComponent = () => {
      return h(
        "div",
        { className: "container py-4" },
        h("h1", { className: "text-2xl font-bold mb-4" }, "Elux Framework"),
        h(
          "p",
          { className: "mb-4" },
          "This is rendered directly with our VDOM implementation."
        ),
        h(
          "div",
          { className: "card card-default p-4" },
          h("h2", { className: "card-title" }, "Component Test"),
          h(
            "p",
            {},
            "If you can see this, the h function and mount are working!"
          )
        )
      );
    };

    // Try to mount it
    console.log("[ELUX] Mounting simple component");
    mount(h(SimpleComponent, {}), appContainer);
    console.log("[ELUX] Component mounted");

    return true;
  } catch (error) {
    console.error("[ELUX] Error during direct component render:", error);
    return false;
  }
}

// Initialize client with the router
function initClient() {
  console.log("[ELUX] Initializing client");

  // Check if styles are loaded
  checkCssLoaded();

  // Initialize state from server data if available
  if ((window as any).__INITIAL_DATA__) {
    console.log("[ELUX] Hydrating state from server data");
    hydrateState((window as any).__INITIAL_DATA__);
  } else {
    // Use default state as fallback
    console.log("[ELUX] Using default state (no server data found)");
    hydrateState(initialState);
  }

  try {
    // Try direct component rendering first to ensure base functionality works
    const componentRendered = tryDirectComponentRender();

    if (!componentRendered) {
      console.warn(
        "[ELUX] Direct component rendering failed, falling back to direct DOM rendering"
      );
      renderDirectly();
      return;
    }

    // If component rendered successfully, try initializing the router
    console.log("[ELUX] Initializing file-based router");
    setTimeout(() => {
      try {
        initRouter("#app");
        console.log("[ELUX] Router initialized successfully");
      } catch (error) {
        console.error("[ELUX] Router initialization failed:", error);
        // Only use direct rendering as fallback if router fails
        renderDirectly();
      }
    }, 200);
  } catch (error) {
    console.error("[ELUX] Initialization failed:", error);
    // Only use direct rendering as fallback if router fails
    renderDirectly();
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[ELUX] DOM Content Loaded - Starting initialization");
    console.log("[ELUX] App container:", document.getElementById("app"));

    try {
      initClient();
    } catch (error) {
      console.error("[ELUX] Fatal error during initialization:", error);
      document.getElementById("app")!.innerHTML = `
        <div style="color: red; padding: 20px; border: 1px solid red;">
          <h2>Error Initializing Application</h2>
          <pre>${error instanceof Error ? error.stack : String(error)}</pre>
        </div>
      `;
    }
  });
} else {
  initClient();
}

// Expose direct render function for debugging
(window as any).eluxRenderDirect = renderDirectly;
(window as any).eluxTryDirectComponentRender = tryDirectComponentRender;

// For backward compatibility - these now use the context system internally
export function updateProps(props: Record<string, any>) {
  console.log("[ELUX] updateProps called with:", props);
  updateState(props);
}

export function getProps() {
  // This is deprecated but maintained for backward compatibility
  console.warn(
    "[ELUX] getProps is deprecated. Use eState() or usePageProps() instead."
  );
  return (window as any).__INITIAL_DATA__ || initialState;
}

// Re-export the context API to make it available from client.ts
export { eState, usePageProps } from "../core/context";

// Define global types for TypeScript
declare global {
  interface Window {
    incrementCount: () => void;
    eluxRenderDirect: () => void;
    eluxTryDirectComponentRender: () => boolean;
    __INITIAL_DATA__?: Record<string, any>;
  }
}
