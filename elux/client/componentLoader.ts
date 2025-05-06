// Component loader - responsible for dynamically loading components
import { h, VNode } from "./renderer";

// NO HARD-CODED IMPORTS - Let everything be dynamic
// This avoids having to manually update this file when adding/removing components

// -----------------------------------------------------------
// Automatic Component Discovery System
// -----------------------------------------------------------

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

// Component cache to avoid reloading - initialized empty
const componentCache: Record<string, any> = {};

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
    ),
    h(
      "p",
      { style: { marginTop: "10px" } },
      "This component failed to load. Check the console for more details."
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
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        padding: "40px 0",
      },
    },
    h("div", {
      style: {
        width: "40px",
        height: "40px",
        border: "4px solid #f3f3f3",
        borderTop: "4px solid #3498db",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      },
    }),
    h(
      "style",
      null,
      "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }"
    ),
    h("p", { style: { marginTop: "15px", color: "#555" } }, "Loading...")
  );
}

// Load a page component by route
export async function loadPageComponent(route: string): Promise<any> {
  // Check if we have it cached
  if (componentCache[route]) {
    return componentCache[route];
  }

  try {
    // Try to discover the component for this route
    const component = await discoverRoute(route);

    if (component) {
      // Cache for future use
      componentCache[route] = component;
      return component;
    }

    // No component found
    return null;
  } catch (error) {
    console.error(
      `[ComponentLoader] Failed to load page for route ${route}:`,
      error
    );
    return null;
  }
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
    componentCache[relativePath] = discoveredComponent;
    return discoveredComponent;
  }

  // Log an error for any component not found
  console.error(`[Component Loader] Component not found: ${relativePath}`);
  throw new Error(
    `Component ${relativePath} not found - please check the file exists`
  );
}
