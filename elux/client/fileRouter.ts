/**
 * Elux File-Based Router
 * Handles automatic routing based on file system structure
 */

import { h, mount } from "./renderer";
import { routes } from "../routes";
import { print, printError } from "../core/utils";

// Define the routes type to avoid TypeScript errors
type Routes = {
  [path: string]: () => Promise<any>;
} & {
  "*"?: () => Promise<any>;
};

// Cast routes to proper type
const typedRoutes = routes as Routes;

// Router state
let currentPath =
  typeof window !== "undefined" ? window.location.pathname : "/";
let rootElement: HTMLElement | null = null;

// Component cache to avoid reloading components unnecessarily
const componentCache: Record<string, any> = {};

// Layout cache for reusable layouts
const layoutCache: Record<string, any> = {};

/**
 * Initialize the router
 */
export function initRouter(elementSelector: string = "#app") {
  print("[FileRouter] Initializing with routes:", Object.keys(typedRoutes));

  // Get the root element
  rootElement = document.querySelector<HTMLElement>(elementSelector);
  if (!rootElement) {
    throw new Error(`Root element not found: ${elementSelector}`);
  }

  // Set up navigation handlers
  setupNavigation();

  // Initial render
  renderCurrentRoute();

  print("[FileRouter] Initialized successfully");
}

/**
 * Set up navigation event handlers
 */
export function setupNavigation() {
  if (typeof window === "undefined") return;

  // Handle popstate (browser back/forward)
  window.addEventListener("popstate", () => {
    currentPath = window.location.pathname;
    renderCurrentRoute();
  });

  print("[FileRouter] Navigation handlers set up");
}

/**
 * Export the setupNavigation function with a different name for client.ts
 */
export const setupLinkHandling = setupNavigation;

/**
 * Export the initRouter function with a different name for client.ts
 */
export const initHistory = initRouter;

/**
 * Navigate to a route
 */
export function navigate(path: string, replace: boolean = false) {
  if (path === currentPath) return;

  print(`[FileRouter] Navigate called for path: ${path}`);

  // Always update the URL in the browser
  if (replace) {
    window.history.replaceState({}, "", path);
  } else {
    window.history.pushState({}, "", path);
  }

  // Update current path
  currentPath = path;

  // Render the route (will handle non-existent routes by showing notfound content)
  renderCurrentRoute();

  print(`[FileRouter] Navigated to: ${path}`);
}

/**
 * Redirect to a new route, replacing the current history entry
 * Use this for programmatic redirects (like 404 -> home)
 */
export function redirect(path: string, options: { delay?: number } = {}) {
  const { delay = 0 } = options;

  print(
    `[FileRouter] Redirecting to ${path}${
      delay ? ` with ${delay}ms delay` : ""
    }`
  );

  if (delay > 0) {
    setTimeout(() => {
      navigate(path, true);
    }, delay);
  } else {
    navigate(path, true);
  }
}

/**
 * Match a dynamic route pattern against a path
 */
function matchDynamicRoute(route: string, path: string): boolean {
  const routeParts = route.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

  if (routeParts.length !== pathParts.length) {
    return false;
  }

  return routeParts.every((part, i) => {
    if (part.startsWith(":")) return true; // Dynamic part matches anything
    return part === pathParts[i];
  });
}

/**
 * Extract params from a dynamic route
 */
function extractParams(route: string, path: string): Record<string, string> {
  const routeParts = route.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  const params: Record<string, string> = {};

  routeParts.forEach((part, i) => {
    if (part.startsWith(":")) {
      const paramName = part.slice(1);
      params[paramName] = pathParts[i];
    }
  });

  return params;
}

/**
 * Normalize paths by removing trailing slashes (except for root path)
 */
function normalizePath(path: string): string {
  return path === "/" ? path : path.replace(/\/+$/, "");
}

/**
 * Get the matching route and params from a path
 */
function getRouteAndParams(
  path: string,
  routes: Record<string, () => Promise<any>>
) {
  // Normalize the path
  const normalizedPath = normalizePath(path);
  print(`[FileRouter] Looking for route match for path: ${normalizedPath}`);
  print(
    `[FileRouter] Available routes: ${JSON.stringify(Object.keys(routes))}`
  );

  // Check if this is a special route that doesn't exist but we're trying to navigate to anyway
  const isSpecialPath =
    !routes[normalizedPath] && normalizedPath !== "/notfound";

  // Check for exact route match
  if (routes[normalizedPath]) {
    print(`[FileRouter] Found exact route match: ${normalizedPath}`);
    return { route: normalizedPath, params: {} };
  }

  // Check for dynamic routes (containing ":")
  const dynamicRoutes = Object.keys(routes).filter((r) => r.includes(":"));

  for (const routePattern of dynamicRoutes) {
    if (matchDynamicRoute(routePattern, normalizedPath)) {
      print(`[FileRouter] Found dynamic route match: ${routePattern}`);
      return {
        route: routePattern,
        params: extractParams(routePattern, normalizedPath),
      };
    }
  }

  // Special handling for routes that don't match anything
  if (isSpecialPath) {
    print(
      `[FileRouter] No route match found for: ${normalizedPath}, will use notfound`
    );
    return { route: "", params: { path: normalizedPath } };
  }

  // Return empty with no match - the caller will handle 404
  print(`[FileRouter] No route match found for: ${normalizedPath}`);
  return { route: "", params: { path: normalizedPath } };
}

/**
 * Render the current route
 */
export async function renderCurrentRoute() {
  // Get current pathname and root element
  const pathname = window.location.pathname;
  print(`[FileRouter] Rendering route for path: ${pathname}`);

  const rootSelector = "#app";
  const rootElement = document.querySelector<HTMLElement>(rootSelector);

  if (!rootElement) {
    printError(
      `[FileRouter] Root element ${rootSelector} not found. Make sure your HTML has a div with id="app".`
    );
    // Try to create root element as fallback
    const fallbackRoot = document.createElement("div");
    fallbackRoot.id = "app";
    document.body.appendChild(fallbackRoot);
    print(`[FileRouter] Created fallback root element #app`);

    // Use fallback
    renderCurrentRoute();
    return;
  }

  // Show loading indicator
  const loadingIndicator = document.createElement("div");
  loadingIndicator.className = "loading-indicator";
  loadingIndicator.style.display = "flex";
  loadingIndicator.style.justifyContent = "center";
  loadingIndicator.style.alignItems = "center";
  loadingIndicator.style.height = "50vh";

  const spinner = document.createElement("div");
  spinner.className = "spinner";
  spinner.style.width = "40px";
  spinner.style.height = "40px";
  spinner.style.border = "4px solid rgba(0, 0, 0, 0.1)";
  spinner.style.borderRadius = "50%";
  spinner.style.borderTopColor = "#3498db";
  spinner.style.animation = "spin 1s linear infinite";

  // Add keyframes for spinner animation if not already in the document
  if (!document.getElementById("spinner-keyframes")) {
    const style = document.createElement("style");
    style.id = "spinner-keyframes";
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  loadingIndicator.appendChild(spinner);

  // Clear root element and add loading indicator
  rootElement.innerHTML = "";
  rootElement.appendChild(loadingIndicator);

  try {
    // Find the matching route
    const { route, params } = getRouteAndParams(pathname, typedRoutes);
    print(`[FileRouter] Route match result:`, { route, params });

    // Handle 404 for routes that don't exist
    if (!route) {
      print(`[FileRouter] No route found for ${pathname}, showing 404 page`);

      try {
        // Try to load the not-found page if available
        if (typedRoutes["/notfound"]) {
          const notFoundModule = await typedRoutes["/notfound"]();
          const NotFoundPage = notFoundModule.default;

          if (NotFoundPage) {
            // Render the not-found page
            mount(h(NotFoundPage, { path: pathname }), rootElement);
          } else {
            rootElement.innerHTML = `
              <div style="padding: 2rem; max-width: 600px; margin: 0 auto;">
                <h1>Page Not Found</h1>
                <p>The page at <code>${pathname}</code> does not exist.</p>
                <p><a href="/">Go Home</a></p>
              </div>
            `;
          }
        } else {
          // Fallback 404 if no not-found page exists
          rootElement.innerHTML = `
            <div style="padding: 2rem; max-width: 600px; margin: 0 auto;">
              <h1>Page Not Found</h1>
              <p>The page at <code>${pathname}</code> does not exist.</p>
              <p><a href="/">Go Home</a></p>
            </div>
          `;
        }
      } catch (error) {
        printError("[FileRouter] Error loading not-found page:", error);
        rootElement.innerHTML = `
          <div style="padding: 2rem; max-width: 600px; margin: 0 auto;">
            <h1>Page Not Found</h1>
            <p>The page at <code>${pathname}</code> does not exist.</p>
            <p><a href="/">Go Home</a></p>
          </div>
        `;
      }

      return;
    }

    // Load the route module
    print(`[FileRouter] Loading route module for ${route}`);
    const routeModule = await typedRoutes[route]();

    // Check if we actually got a module and it has a default export
    if (!routeModule || !routeModule.default) {
      printError(
        `[FileRouter] Route module for ${route} doesn't have a default export`
      );
      rootElement.innerHTML = `
        <div style="padding: 2rem; max-width: 600px; margin: 0 auto;">
          <h1>Route Loading Error</h1>
          <p>The page at <code>${pathname}</code> could not be loaded properly.</p>
          <p><a href="/">Go Home</a></p>
        </div>
      `;
      return;
    }

    // Get the page component
    const PageComponent = routeModule.default;
    print(`[FileRouter] Loaded page component for ${route}`);

    // Remove the loading indicator
    const loadingElem = rootElement.querySelector(".loading-indicator");
    if (loadingElem) {
      rootElement.removeChild(loadingElem);
    }

    // Create props including params and any getStaticProps/getServerSideProps data
    const props = { params, ...params };

    try {
      // Render the page component
      if (typeof PageComponent === "function") {
        // If it's a component function, render it
        mount(h(PageComponent, props), rootElement);
        print(`[FileRouter] Mounted page component for ${route}`);
      } else {
        // Handle non-function components
        printError(
          `[FileRouter] Page component for ${route} is not a function:`,
          PageComponent
        );
        rootElement.innerHTML = `
          <div style="padding: 2rem; max-width: 600px; margin: 0 auto;">
            <h1>Page Error</h1>
            <p>The page at <code>${pathname}</code> couldn't be rendered.</p>
            <p><a href="/">Go Home</a></p>
          </div>
        `;
      }
    } catch (renderError) {
      printError(
        `[FileRouter] Error rendering page for ${route}:`,
        renderError
      );
      rootElement.innerHTML = `
        <div style="padding: 2rem; max-width: 600px; margin: 0 auto;">
          <h1>Rendering Error</h1>
          <p>An error occurred while rendering the page at <code>${pathname}</code>.</p>
          <p><pre>${renderError}</pre></p>
          <p><a href="/">Go Home</a></p>
        </div>
      `;
    }
  } catch (error) {
    // Handle any errors that occurred during route handling
    printError("[FileRouter] Error rendering route:", error);
    rootElement.innerHTML = `
      <div style="padding: 2rem; max-width: 600px; margin: 0 auto;">
        <h1>Routing Error</h1>
        <p>An error occurred while loading the page at <code>${pathname}</code>.</p>
        <p><pre>${error}</pre></p>
        <p><a href="/">Go Home</a></p>
      </div>
    `;
  }
}
