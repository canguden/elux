// Component loader - responsible for dynamically loading components
import { h, VNode } from "./renderer";

// Import base components - these don't change frequently
import HomePage from "../../app/page";
import AboutPage from "../../app/about/page";
import { Counter } from "../../app/components/Counter";
import { Demo } from "../../app/components/Demo";

// -----------------------------------------------------------
// Automatic Component Discovery System
// -----------------------------------------------------------

// Dynamic route pattern detector
const ROUTE_PATTERNS = [
  { pattern: /^\/$/i, component: HomePage },
  { pattern: /^\/about\/?$/i, component: AboutPage },
];

// This map will be auto-populated with discovered components
const discoveredComponents: Map<string, any> = new Map();

// Attempt to discover a component at runtime
async function discoverComponent(componentPath: string): Promise<any> {
  console.log(
    `[Auto-Discovery] Attempting to discover component: ${componentPath}`
  );

  try {
    // Try different path formats
    const possiblePaths = [
      // Standard path
      `../../app/${componentPath}`,
      // Without extension
      `../../app/${componentPath.replace(/\.(tsx|ts|jsx|js)$/, "")}`,
      // With page suffix
      `../../app/${componentPath}/page`,
      // With index
      `../../app/${componentPath}/index`,
    ];

    // Try each possible path
    for (const path of possiblePaths) {
      try {
        console.log(`[Auto-Discovery] Trying path: ${path}`);
        const module = await import(/* @vite-ignore */ path);
        if (module && (module.default || Object.keys(module).length > 0)) {
          console.log(`[Auto-Discovery] Found component at: ${path}`);
          return module.default || module;
        }
      } catch (err) {
        // Silently continue to the next path
      }
    }

    throw new Error(
      `Could not discover component at any expected path for ${componentPath}`
    );
  } catch (error) {
    console.error(
      `[Auto-Discovery] Discovery failed for ${componentPath}:`,
      error
    );
    return null;
  }
}

// Detect component type from path
function detectComponentType(componentPath: string): "page" | "component" {
  if (componentPath.includes("/page") || componentPath === "page") {
    return "page";
  }
  return "component";
}

// Dynamically try to discover a route component based on URL pattern
async function discoverRoute(route: string): Promise<any> {
  console.log(
    `[Auto-Discovery] Attempting to discover route component for: ${route}`
  );

  // Check static patterns first
  for (const { pattern, component } of ROUTE_PATTERNS) {
    if (pattern.test(route)) {
      console.log(
        `[Auto-Discovery] Found static route pattern match for: ${route}`
      );
      return component;
    }
  }

  // Generate possible paths from route
  const normalizedRoute = route === "/" ? "" : route;
  const possiblePaths = [
    // Standard page path
    `${
      normalizedRoute.startsWith("/")
        ? normalizedRoute.slice(1)
        : normalizedRoute
    }/page`,
    // Index page in directory
    `${
      normalizedRoute.startsWith("/")
        ? normalizedRoute.slice(1)
        : normalizedRoute
    }/index`,
    // Direct page file
    `${
      normalizedRoute.startsWith("/")
        ? normalizedRoute.slice(1)
        : normalizedRoute.replace(/\/$/, "")
    }`,
  ];

  // Try each possible path
  for (const path of possiblePaths) {
    const component = await discoverComponent(path);
    if (component) {
      // Register this route pattern for future use
      const pattern = new RegExp(`^${route}\\/?$`, "i");
      ROUTE_PATTERNS.push({ pattern, component });
      return component;
    }
  }

  console.warn(
    `[Auto-Discovery] Could not discover any component for route: ${route}`
  );
  return null;
}

// -----------------------------------------------------------
// Standard Component Interfaces
// -----------------------------------------------------------

// Component cache to avoid reloading
const componentCache: Record<string, any> = {
  // Initialize cache with known components
  "/": HomePage,
  "/about": AboutPage,
  "components/Counter": Counter,
  "components/Demo": Demo,
};

// Error component to show when a component fails to load
export function ErrorComponent({
  error,
  componentPath,
}: {
  error: any;
  componentPath: string;
}): VNode {
  return h(
    "div",
    {
      style: {
        padding: "15px",
        margin: "10px 0",
        borderRadius: "4px",
        backgroundColor: "#fff0f0",
        border: "2px solid #ff0000",
        color: "#ff0000",
      },
    },
    h(
      "h3",
      { style: { margin: "0 0 10px 0" } },
      `Error Loading Component: ${componentPath}`
    ),
    h(
      "pre",
      { style: { margin: 0, fontSize: "14px", fontFamily: "monospace" } },
      error instanceof Error
        ? `${error.message}\n${error.stack}`
        : String(error)
    )
  );
}

// Not found component for 404 pages
export function NotFoundComponent({ route }: { route: string }): VNode {
  return h(
    "div",
    {
      style: {
        padding: "20px",
        margin: "20px 0",
        borderRadius: "4px",
        backgroundColor: "#f8f9fa",
        border: "1px solid #dee2e6",
        textAlign: "center",
      },
    },
    h(
      "h1",
      { style: { fontSize: "24px", marginBottom: "16px" } },
      "404 - Page Not Found"
    ),
    h(
      "p",
      { style: { marginBottom: "16px" } },
      `The page ${route} you're looking for doesn't exist.`
    ),
    h(
      "p",
      null,
      "To create this page, add ",
      h(
        "code",
        {
          style: {
            backgroundColor: "#f1f1f1",
            padding: "2px 4px",
            borderRadius: "3px",
            fontFamily: "monospace",
          },
        },
        `app${route === "/" ? "" : route}/page.tsx`
      ),
      " to your project."
    ),
    h(
      "a",
      {
        href: "/",
        style: {
          display: "inline-block",
          marginTop: "16px",
          padding: "8px 16px",
          backgroundColor: "#0d6efd",
          color: "white",
          borderRadius: "4px",
          textDecoration: "none",
        },
      },
      "Go Home"
    )
  );
}

// Loading placeholder component
export function LoadingComponent(): VNode {
  return h(
    "div",
    {
      style: {
        padding: "15px",
        margin: "10px 0",
        borderRadius: "4px",
        backgroundColor: "#f0f0f0",
        border: "1px solid #ccc",
      },
    },
    h("p", { style: { margin: 0 } }, "Loading component...")
  );
}

// Load a page component from the app directory
export async function loadPageComponent(route: string): Promise<any> {
  console.log(`[Component Loader] Loading page component for route: ${route}`);

  // Check if component is already in cache
  if (componentCache[route]) {
    console.log(
      `[Component Loader] Returning cached component for route: ${route}`
    );
    return componentCache[route];
  }

  // Try auto-discovery
  const discoveredComponent = await discoverRoute(route);
  if (discoveredComponent) {
    console.log(
      `[Component Loader] Auto-discovered component for route: ${route}`
    );
    componentCache[route] = discoveredComponent;
    return discoveredComponent;
  }

  // If still not found, fall back to hardcoded options
  if (route === "/") {
    return HomePage;
  } else if (route === "/about") {
    return AboutPage;
  }

  // Return 404 component as last resort
  console.warn(`[Component Loader] No component found for route: ${route}`);
  return () => NotFoundComponent({ route });
}

// Load a component by its path relative to the app directory
export async function loadComponent(relativePath: string): Promise<any> {
  // Check if component is in cache
  if (componentCache[relativePath]) {
    console.log(`[Component Loader] Found cached component: ${relativePath}`);
    return componentCache[relativePath];
  }

  // Check in discovered components
  if (discoveredComponents.has(relativePath)) {
    return discoveredComponents.get(relativePath);
  }

  console.log(`[Component Loader] Looking for component: ${relativePath}`);

  // Try auto-discovery
  const discoveredComponent = await discoverComponent(relativePath);
  if (discoveredComponent) {
    console.log(
      `[Component Loader] Auto-discovered component: ${relativePath}`
    );
    discoveredComponents.set(relativePath, discoveredComponent);
    return discoveredComponent;
  }

  // Fallback to known components
  if (relativePath === "components/Counter") {
    return Counter;
  }

  if (relativePath === "components/Demo") {
    return Demo;
  }

  // Log an error for any other components not found
  console.error(`[Component Loader] Component not found: ${relativePath}`);
  throw new Error(
    `Component ${relativePath} not found in static imports or auto-discovery`
  );
}
