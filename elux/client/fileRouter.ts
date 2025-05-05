/**
 * Elux File-Based Router
 * Handles automatic routing based on file system structure
 */

import { h, mount } from "./renderer";
import { routes } from "../routes";
import { LoadingComponent, ErrorComponent } from "./componentLoader";

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

// Component cache
const componentCache: Record<string, any> = {};

/**
 * Initialize the router
 */
export function initRouter(elementSelector: string = "#app") {
  console.log(
    "[FileRouter] Initializing with routes:",
    Object.keys(typedRoutes)
  );

  // Get the root element
  rootElement = document.querySelector(elementSelector);
  if (!rootElement) {
    throw new Error(`Root element not found: ${elementSelector}`);
  }

  // Set up navigation handlers
  setupNavigation();

  // Initial render
  renderCurrentRoute();

  console.log("[FileRouter] Initialized successfully");
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

  // Handle link clicks
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");
    const href = link?.getAttribute("href");

    if (
      link &&
      href &&
      !href.startsWith("http") &&
      !href.startsWith("//") &&
      !href.startsWith("#") &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      navigate(href);
    }
  });

  console.log("[FileRouter] Navigation handlers set up");
}

/**
 * Navigate to a route
 */
export function navigate(path: string, replace: boolean = false) {
  if (path === currentPath) return;

  // Update history
  if (replace) {
    window.history.replaceState({}, "", path);
  } else {
    window.history.pushState({}, "", path);
  }

  // Update current path and render
  currentPath = path;
  renderCurrentRoute();

  console.log(`[FileRouter] Navigated to: ${path}`);
}

/**
 * Render the current route
 */
export async function renderCurrentRoute() {
  if (!rootElement) return;

  console.log(`[FileRouter] Rendering route: ${currentPath}`);

  // Show loading state
  mount(h(LoadingComponent, {}), rootElement);

  try {
    // Find the matching route
    const exactRoute = typedRoutes[currentPath];
    const dynamicRoutes = Object.keys(typedRoutes).filter(
      (r) => r.includes(":") && matchDynamicRoute(r, currentPath)
    );

    let routeLoader = exactRoute;
    let params = {};

    // If no exact match, try dynamic routes
    if (!routeLoader && dynamicRoutes.length > 0) {
      const matchedRoute = dynamicRoutes[0];
      params = extractParams(matchedRoute, currentPath);
      routeLoader = typedRoutes[matchedRoute];
    }

    // If still no match, try the catch-all route
    if (!routeLoader && typedRoutes["*"]) {
      routeLoader = typedRoutes["*"];
    }

    if (!routeLoader) {
      console.error(`[FileRouter] No route found for: ${currentPath}`);
      mount(
        h(ErrorComponent, {
          error: new Error(`Page not found: ${currentPath}`),
          componentPath: currentPath,
        }),
        rootElement
      );
      return;
    }

    // Load the component
    try {
      // Check cache first
      if (componentCache[currentPath]) {
        const Component = componentCache[currentPath];
        mount(h(Component, { params }), rootElement);
        return;
      }

      // Load the component
      const module = await routeLoader();
      const Component = module.default;

      if (!Component) {
        throw new Error(`No default export found for route: ${currentPath}`);
      }

      // Cache the component
      componentCache[currentPath] = Component;

      // Render the component
      mount(h(Component, { params }), rootElement);
    } catch (error) {
      console.error(`[FileRouter] Error loading component:`, error);
      mount(
        h(ErrorComponent, {
          error,
          componentPath: currentPath,
        }),
        rootElement
      );
    }
  } catch (error) {
    console.error(`[FileRouter] Error rendering route:`, error);
    mount(
      h(ErrorComponent, {
        error,
        componentPath: currentPath,
      }),
      rootElement
    );
  }
}

/**
 * Check if a dynamic route matches a path
 */
function matchDynamicRoute(route: string, path: string): boolean {
  const routeParts = route.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

  if (routeParts.length !== pathParts.length) return false;

  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i];
    if (routePart.startsWith(":")) continue;
    if (routePart !== pathParts[i]) return false;
  }

  return true;
}

/**
 * Extract parameters from a dynamic route
 */
function extractParams(route: string, path: string): Record<string, string> {
  const params: Record<string, string> = {};
  const routeParts = route.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i];
    if (routePart.startsWith(":")) {
      const paramName = routePart.substring(1);
      params[paramName] = pathParts[i];
    }
  }

  return params;
}
