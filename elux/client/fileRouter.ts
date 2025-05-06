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
function setupNavigation() {
  if (typeof window === "undefined") return;

  // Handle popstate (browser back/forward)
  window.addEventListener("popstate", () => {
    currentPath = window.location.pathname;
    renderCurrentRoute();
  });

  print("[FileRouter] Navigation handlers set up");
}

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
  loadingIndicator.style.display = "flex";
  loadingIndicator.style.justifyContent = "center";
  loadingIndicator.style.alignItems = "center";
  loadingIndicator.style.height = "50vh";

  const spinner = document.createElement("div");
  spinner.style.width = "40px";
  spinner.style.height = "40px";
  spinner.style.border = "4px solid #f3f3f3";
  spinner.style.borderTop = "4px solid #3498db";
  spinner.style.borderRadius = "50%";
  spinner.style.animation = "spin 1s linear infinite";

  const style = document.createElement("style");
  style.textContent =
    "@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}";

  loadingIndicator.appendChild(spinner);
  loadingIndicator.appendChild(style);

  // Only clear content and show loading if not the initial SSR render
  if (rootElement.dataset.hydrated === "true") {
    print("[FileRouter] Clearing content and showing loading indicator");
    rootElement.innerHTML = "";
    rootElement.appendChild(loadingIndicator);
  } else {
    // Mark as hydrated for future navigations
    print("[FileRouter] First render, marking as hydrated");
    rootElement.dataset.hydrated = "true";
  }

  try {
    // Find the correct route
    const normalizedPath = normalizePath(pathname);
    const { route: matchedRoute, params } = getRouteAndParams(
      normalizedPath,
      typedRoutes
    );

    let routePath = matchedRoute;

    // Handle not found routes
    if (!routePath) {
      print("[FileRouter] No route matched, handling 404");
      // Try notfound page
      if (typedRoutes["/notfound"]) {
        print("[FileRouter] Using /notfound page");
        routePath = "/notfound";
        params.path = normalizedPath;
        // Don't redirect the URL - keep showing the actual URL that wasn't found
        // This fixes the confusion where the URL shows one thing but the content is from another URL
      } else {
        // No notfound page available, show inline error
        print("[FileRouter] No notfound page available, showing inline error");
        rootElement.innerHTML = `
          <div style="padding: 20px; margin: 20px; border: 1px solid #f44336; border-radius: 4px;">
            <h1 style="color: #f44336;">Page Not Found</h1>
            <p>The requested route "${normalizedPath}" does not exist.</p>
            <p>Please create a <code>/app/notfound.tsx</code> page for better error handling.</p>
            <div style="margin-top: 20px;">
              <a href="/" style="color: #0066cc; text-decoration: underline;">Go to Home Page</a>
            </div>
          </div>
        `;
        return;
      }
    }

    // Load page component
    let PageComponent = null;
    let loadError = null;
    try {
      // Use cached component if available to avoid unnecessary reloads
      if (componentCache[routePath]) {
        print(`[FileRouter] Using cached component for route: ${routePath}`);
        PageComponent = componentCache[routePath];
      } else {
        print(`[FileRouter] Loading component for route: ${routePath}`);
        print(`[FileRouter] Import function:`, typedRoutes[routePath]);

        // For client navigation to non-existent routes (like /test)
        if (!typedRoutes[routePath] && routePath !== "/notfound") {
          print(
            `[FileRouter] No import function found for route: ${routePath}`
          );
          // Force using the notfound page
          if (typedRoutes["/notfound"]) {
            print(`[FileRouter] Falling back to /notfound page`);
            try {
              const notfoundModule = await typedRoutes["/notfound"]();
              if (notfoundModule && notfoundModule.default) {
                print(`[FileRouter] Successfully loaded notfound page`);
                PageComponent = notfoundModule.default;
                // Add path param to make it clear what path was not found
                params.path = normalizedPath;
              } else {
                throw new Error("Notfound module has no default export");
              }
            } catch (error) {
              printError(`[FileRouter] Failed to load notfound page:`, error);
              throw error;
            }
          } else {
            throw new Error(
              `Route ${routePath} not found and no notfound page available`
            );
          }
        } else {
          try {
            print(`[FileRouter] Loading module for route: ${routePath}`);
            const pageModule = await typedRoutes[routePath]();
            print(`[FileRouter] Page module loaded:`, pageModule);

            PageComponent = pageModule.default;
            print(`[FileRouter] Page component:`, PageComponent);

            if (!PageComponent) {
              throw new Error(`No default export for ${routePath}`);
            }
          } catch (error) {
            printError(`[FileRouter] Error loading page module:`, error);
            throw error;
          }
        }

        // Cache the component for future use
        print(`[FileRouter] Caching component for route: ${routePath}`);
        componentCache[routePath] = PageComponent;
      }
    } catch (error: any) {
      printError("[FileRouter] Error loading page component:", error);
      loadError = error;

      // Try to use notfound page if available
      if (typedRoutes["/notfound"] && routePath !== "/notfound") {
        try {
          print(`[FileRouter] Attempting to load notfound page after error`);
          const notfoundModule = await typedRoutes["/notfound"]();
          PageComponent = notfoundModule.default;
          // Add path param to make it clear what path had an error
          params.path = normalizedPath;
        } catch (notfoundError) {
          // If even the notfound page fails, show a basic error message
          printError(
            "[FileRouter] Failed to load notfound page:",
            notfoundError
          );
        }
      }

      // If we couldn't load the notfound page or any component, show error message
      if (!PageComponent) {
        rootElement.innerHTML = `
          <div style="padding: 20px; margin: 20px; border: 1px solid #f44336; border-radius: 4px;">
            <h1 style="color: #f44336;">Error Loading Page</h1>
            <p>${error?.message || "Unknown error"}</p>
            <pre style="background: #f5f5f5; padding: 10px; margin-top: 10px; overflow: auto;">${
              error?.stack || ""
            }</pre>
          </div>
        `;
        return;
      }
    }

    // Load layout component
    let LayoutComponent = null;
    try {
      // Try specific layout for this route first
      const routeDir = routePath.split("/").slice(0, -1).join("/");
      print(`[FileRouter] Looking for layout for route: ${routeDir || "/"}`);

      // Use cached layout if available
      if (layoutCache[routePath]) {
        print(`[FileRouter] Using cached layout for route: ${routePath}`);
        LayoutComponent = layoutCache[routePath];
      } else {
        try {
          // Try to find the most specific layout by walking up the path
          const layoutParts = normalizedPath.split("/").filter(Boolean);
          let layoutPath = "";

          // Import the top-level layout first as fallback
          try {
            print("[FileRouter] Trying to load root layout: ../../app/layout");
            const rootLayoutModule = await import("../../app/layout.tsx");
            print("[FileRouter] Root layout module loaded:", rootLayoutModule);
            LayoutComponent = rootLayoutModule.default;
            print("[FileRouter] Root layout component:", LayoutComponent);
          } catch (error) {
            const err = error as Error;
            print("[FileRouter] No root layout found:", err.message);
            // No root layout, that's fine
          }

          // Try to find the most specific layout by walking up the path
          for (let i = 0; i < layoutParts.length; i++) {
            layoutPath = `/${layoutParts.slice(0, i + 1).join("/")}`;
            try {
              print(
                `[FileRouter] Trying to load layout: ../../app${layoutPath}/layout`
              );
              // Use dynamic import with .tsx extension for JSX files
              const layoutModule = await import(
                `../../app${layoutPath}/layout.tsx`
              );
              if (layoutModule.default) {
                // Found a more specific layout
                print(
                  `[FileRouter] Found more specific layout at: ${layoutPath}/layout`
                );
                LayoutComponent = layoutModule.default;
              }
            } catch (error) {
              const err = error as Error;
              // No layout at this level, continue with the previous one
              print(`[FileRouter] No layout at: ${layoutPath}/layout`);
            }
          }

          // Cache the resolved layout
          if (LayoutComponent) {
            print(`[FileRouter] Caching layout for route: ${routePath}`);
            layoutCache[routePath] = LayoutComponent;
          }
        } catch (error: any) {
          printError("[FileRouter] Error loading layout:", error);
          // Continue without layout
        }
      }
    } catch (error: any) {
      printError("[FileRouter] Error loading layout:", error);
      // Continue without layout
    }

    // Render the page
    print(`[FileRouter] Rendering page component for route: ${routePath}`);
    print(
      `[FileRouter] Layout component:`,
      LayoutComponent ? "Found" : "Not Found"
    );
    print(
      `[FileRouter] Page component:`,
      PageComponent ? "Found" : "Not Found"
    );

    // For notfound page, make extra effort to get layout if not already found
    if (routePath === "/notfound" && !LayoutComponent) {
      try {
        print("[FileRouter] Specially loading root layout for notfound page");
        const rootLayoutModule = await import("../../app/layout.tsx");
        if (rootLayoutModule.default) {
          LayoutComponent = rootLayoutModule.default;
          print(
            "[FileRouter] Successfully loaded root layout for notfound page"
          );
        }
      } catch (layoutError) {
        printError(
          "[FileRouter] Error loading root layout for notfound:",
          layoutError
        );
      }
    }

    if (LayoutComponent) {
      print("[FileRouter] Mounting with layout");
      mount(
        h(LayoutComponent, { params }, h(PageComponent, { params })),
        rootElement
      );
    } else {
      print("[FileRouter] Mounting without layout");
      mount(h(PageComponent, { params }), rootElement);
    }

    print(`[FileRouter] Route rendered: ${routePath}`);
  } catch (error: any) {
    printError("[FileRouter] Fatal router error:", error);
    rootElement.innerHTML = `
      <div style="padding: 20px; margin: 20px; border: 1px solid #f44336; border-radius: 4px;">
        <h1 style="color: #f44336;">Router Error</h1>
        <p>${error?.message || "Unknown error"}</p>
        <pre style="background: #f5f5f5; padding: 10px; margin-top: 10px; overflow: auto;">${
          error?.stack || ""
        }</pre>
      </div>
    `;
  }
}
