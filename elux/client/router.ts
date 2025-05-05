// Client-side router
import {
  ErrorComponent,
  LoadingComponent,
  loadPageComponent,
} from "./componentLoader";
import { mount, VNode } from "./renderer";

// Event handlers for route change
type RouteChangeHandler = (route: string) => void;
const routeChangeHandlers: RouteChangeHandler[] = [];

// Default props that will be available to all pages
let globalProps: Record<string, any> = {
  count: 0,
  title: "Elux Framework",
  description: "A TypeScript framework from scratch — no React required!",
};

// Page component cache (different from component cache to store instance-specific data)
interface PageCache {
  component: any;
  props: Record<string, any>;
  node?: VNode;
}

const pageCache: Record<string, PageCache> = {};

// Current route
let currentRoute =
  typeof window !== "undefined" ? window.location.pathname : "/";

// Root element where the app will be mounted
let rootElement: Element | null = null;
let isInitialized = false;

// Initialize the router
export function initRouter(
  elementSelector: string = "#app",
  initialProps: Record<string, any> = {}
): void {
  if (isInitialized) {
    console.warn("[Router] Router already initialized");
    return;
  }

  // Find the root element
  rootElement = document.querySelector(elementSelector);
  if (!rootElement) {
    console.error(`[Router] Root element not found: ${elementSelector}`);
    return;
  }

  // Set initial global props
  globalProps = { ...globalProps, ...initialProps };

  // Setup navigation listeners
  setupListeners();

  // Initial route render
  renderCurrentRoute();

  isInitialized = true;
  console.log("[Router] Router initialized");
}

// Get the current route
export function getCurrentRoute(): string {
  return currentRoute;
}

// Setup navigation listeners
function setupListeners(): void {
  // Handle popstate (browser back/forward)
  window.addEventListener("popstate", () => {
    currentRoute = window.location.pathname;
    renderCurrentRoute();
  });

  // Handle click events on the document to capture link clicks
  document.addEventListener("click", (e) => {
    // Check if the click target is a link
    const target = e.target as HTMLElement;
    const link = target.closest("a");

    if (link && link.getAttribute("href")) {
      const href = link.getAttribute("href")!;

      // Skip external links and modified clicks
      if (
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("#") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        link.getAttribute("target") === "_blank" ||
        link.getAttribute("rel") === "external"
      ) {
        return;
      }

      // Handle internal navigation
      e.preventDefault();
      navigate(href);
    }
  });
}

// Navigate to a route
export function navigate(route: string, replaceState: boolean = false): void {
  if (route === currentRoute) {
    console.log(`[Router] Already at route: ${route}`);
    return;
  }

  // Update browser history
  if (replaceState) {
    window.history.replaceState({}, "", route);
  } else {
    window.history.pushState({}, "", route);
  }

  // Update current route
  currentRoute = route;

  // Render the new route
  renderCurrentRoute();

  // Notify handlers
  notifyRouteChange(route);
}

// Subscribe to route changes
export function onRouteChange(handler: RouteChangeHandler): () => void {
  routeChangeHandlers.push(handler);

  // Return unsubscribe function
  return () => {
    const index = routeChangeHandlers.indexOf(handler);
    if (index !== -1) {
      routeChangeHandlers.splice(index, 1);
    }
  };
}

// Notify all subscribers of route change
function notifyRouteChange(route: string): void {
  routeChangeHandlers.forEach((handler) => handler(route));
}

// Update global props
export function updateProps(newProps: Record<string, any>): void {
  globalProps = { ...globalProps, ...newProps };
  renderCurrentRoute();
}

// Get global props
export function getProps(): Record<string, any> {
  return { ...globalProps };
}

// Handle loading state
function renderLoadingState(): void {
  if (!rootElement) return;

  const loadingNode = LoadingComponent();
  mount(loadingNode, rootElement);
}

// Handle error state
function renderErrorState(error: any, componentPath: string): void {
  if (!rootElement) return;

  const errorNode = ErrorComponent({ error, componentPath });
  mount(errorNode, rootElement);
}

// Render the current route
export async function renderCurrentRoute(): Promise<void> {
  if (!rootElement) {
    console.error("[Router] Root element not found");
    return;
  }

  console.log(`[Router] Rendering route: ${currentRoute}`);

  try {
    // Check if the page is in cache
    if (pageCache[currentRoute] && pageCache[currentRoute].component) {
      console.log(
        `[Router] Using cached page component for route: ${currentRoute}`
      );
      const { component: Component, props } = pageCache[currentRoute];

      // Get the latest props combining cached and global
      const combinedProps = { ...globalProps, ...props };

      try {
        // Render the component with error handling
        console.log(
          `[Router] Calling component function with props:`,
          combinedProps
        );
        const node = Component(combinedProps);

        if (!node) {
          console.error(`[Router] Component returned null or undefined`);
          throw new Error("Component returned undefined or null");
        }

        console.log(`[Router] Component returned node:`, node);
        console.log(`[Router] Mounting node to:`, rootElement);
        mount(node, rootElement);
        console.log(`[Router] Node mounted successfully`);

        // Store the node in cache
        pageCache[currentRoute].node = node;
      } catch (error) {
        console.error(`[Router] Error rendering cached component:`, error);
        renderErrorState(error, `Cached component for ${currentRoute}`);
      }

      return;
    }

    // Show loading state
    renderLoadingState();

    try {
      // Load the page component (will return 404 component if page doesn't exist)
      console.log(`[Router] Loading page component for: ${currentRoute}`);
      const PageComponent = await loadPageComponent(currentRoute);
      console.log(`[Router] Page component loaded:`, PageComponent);

      // Create cache entry
      pageCache[currentRoute] = {
        component: PageComponent,
        props: { ...globalProps },
      };

      // Render the component with error handling
      console.log(`[Router] Rendering component with props:`, globalProps);
      const node = PageComponent(globalProps);

      if (!node) {
        console.error(`[Router] Component returned null or undefined`);
        throw new Error("Component returned undefined or null");
      }

      console.log(`[Router] Component returned node:`, node);
      console.log(`[Router] Mounting node to:`, rootElement);
      mount(node, rootElement);
      console.log(`[Router] Node mounted successfully`);

      // Store the node in cache
      pageCache[currentRoute].node = node;

      // Set document title based on the current route
      if (PageComponent.name === "NotFoundComponent") {
        document.title = `404 Not Found | Elux Framework`;
      } else {
        document.title = globalProps.title || "Elux Framework";
      }
    } catch (error) {
      console.error(`[Router] Error rendering page component:`, error);
      renderErrorState(error, `Component for ${currentRoute}`);
    }
  } catch (error) {
    console.error(
      `[Router] Error in route handling for ${currentRoute}:`,
      error
    );
    renderErrorState(error, `Route ${currentRoute}`);
  }
}
