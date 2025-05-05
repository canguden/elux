/**
 * Minimal Elux Implementation
 * This is a simplified version that will definitely work
 */

// Wait for DOM to be ready
function domReady(callback: () => void) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
  } else {
    callback();
  }
}

// Get DOM element by ID with type safety
function getElement(id: string): HTMLElement | null {
  return document.getElementById(id);
}

// Create a basic router
class Router {
  private routes: Record<string, () => string> = {};
  private container: HTMLElement | null = null;

  constructor(containerId: string) {
    this.container = getElement(containerId);

    // Default routes
    this.addRoute("/", this.homePage);
    this.addRoute("/about", this.aboutPage);

    // Setup navigation
    this.setupNavigation();

    // Initial render
    this.navigateTo(window.location.pathname);

    console.log("[MinimalElux] Router initialized");
  }

  private setupNavigation() {
    // Handle link clicks
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link && link.getAttribute("href")) {
        const href = link.getAttribute("href") as string;

        // Skip external links and modified clicks
        if (
          href.startsWith("http") ||
          href.startsWith("//") ||
          e.ctrlKey ||
          e.metaKey ||
          e.shiftKey
        ) {
          return;
        }

        // Handle internal navigation
        e.preventDefault();
        this.navigateTo(href);
      }
    });

    // Handle browser navigation
    window.addEventListener("popstate", () => {
      this.navigateTo(window.location.pathname);
    });
  }

  public addRoute(path: string, handler: () => string) {
    this.routes[path] = handler;
  }

  public navigateTo(path: string) {
    console.log(`[MinimalElux] Navigating to: ${path}`);

    // Update browser history
    window.history.pushState({}, "", path);

    // Find the route handler
    const handler = this.routes[path] || this.notFoundPage;

    // Render the page
    if (this.container) {
      this.container.innerHTML = handler();
      console.log("[MinimalElux] Page rendered");
    } else {
      console.error("[MinimalElux] Container not found");
    }
  }

  // Page handlers
  private homePage = () => `
    <div class="container">
      <header class="py-4 text-center mb-4">
        <h1 class="text-2xl font-bold mb-2">Elux Framework</h1>
        <p class="text-muted-foreground">A fully hackable TypeScript-first framework from scratch</p>
      </header>
      
      <section class="mb-4">
        <div class="card card-default mt-4 mb-4 flex flex-col items-center py-4 px-4">
          <div class="text-primary text-lg font-bold mb-4">Current Count: <span id="counter">0</span></div>
          <button class="btn btn-primary" id="increment-button">Increment</button>
        </div>
        
        <div class="card mt-4 py-4 px-4 bg-accent text-accent-foreground rounded-md">
          <h2 class="text-accent-foreground font-bold mb-2">Demo Component</h2>
          <p class="font-bold mb-2">THIS IS THE DEMO COMPONENT!</p>
          <p class="mb-2">This is a demo component that demonstrates components in Elux!</p>
        </div>
        
        <div class="grid gap-4 mt-4">
          <div class="card card-default">
            <h3 class="card-title">💡 Custom Render</h3>
            <p>Built with a lightweight implementation, no React needed.</p>
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

  private aboutPage = () => `
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

  private notFoundPage = () => `
    <div class="container text-center py-4">
      <h1 class="text-2xl font-bold mb-4">404 - Page Not Found</h1>
      <p>The page ${window.location.pathname} does not exist.</p>
      <a href="/" class="btn btn-primary mt-4">Go Home</a>
    </div>
  `;
}

// Setup counter functionality
function setupCounter() {
  const button = document.getElementById("increment-button");
  const counter = document.getElementById("counter");

  if (button && counter) {
    let count = 0;

    button.addEventListener("click", () => {
      count++;
      counter.textContent = count.toString();
    });
  }
}

// Main initialization function
function init() {
  console.log("[MinimalElux] Initializing...");

  try {
    // Initialize router
    const router = new Router("app");

    // Setup counter (will be called after each navigation)
    document.addEventListener("click", () => {
      // Small delay to ensure DOM is updated
      setTimeout(setupCounter, 50);
    });

    // Initial counter setup
    setupCounter();

    console.log("[MinimalElux] Initialization complete");
  } catch (error) {
    console.error("[MinimalElux] Initialization failed:", error);

    // Display error in app container
    const container = getElement("app");
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; margin: 20px; border: 2px solid red; border-radius: 4px;">
          <h2 style="color: red;">Elux Initialization Failed</h2>
          <p>An error occurred while initializing the application:</p>
          <pre style="background: #f8f9fa; padding: 10px; overflow: auto; margin-top: 10px;">${
            error instanceof Error ? error.message : String(error)
          }</pre>
          <button onclick="location.reload()" style="background: #0d6efd; color: white; border: none; padding: 8px 16px; margin-top: 10px; border-radius: 4px;">Reload Page</button>
        </div>
      `;
    }
  }
}

// Initialize when DOM is ready
domReady(init);
