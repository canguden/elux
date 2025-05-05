import { mount, h } from "./renderer";

// Add type declaration for Vite's HMR
declare interface ImportMeta {
  hot?: {
    accept(callback?: (modules: any) => void): void;
    dispose(callback: (data: any) => void): void;
  };
}

// Initial state for our application
const initialState = {
  count: 0,
  title: "Elux Framework",
  description: "A TypeScript framework from scratch — no React required!",
};

// HMR support for development
// @ts-ignore - Vite-specific HMR API
if (typeof import.meta.hot !== "undefined") {
  // @ts-ignore - Vite-specific HMR API
  import.meta.hot.accept(() => {
    console.log("[HMR] App updated, refreshing...");
    renderCurrentRoute(initialState);
  });
}

// CSS class helper
function cx(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// Simple routing system
const routes = {
  "/": HomePage,
  "/about": AboutPage,
};

// Get current route
const getCurrentRoute = () => {
  return window.location.pathname;
};

// Create About page component
function AboutPage(props: any) {
  const styles = getDefaultStyles();

  return h(
    "div",
    { className: "container", style: styles.container },
    h(
      "header",
      { className: "header", style: styles.header },
      h(
        "div",
        { className: "header-inner", style: styles.headerInner },
        h(
          "a",
          { href: "/", className: "header-logo", style: styles.headerLogo },
          "Elux"
        ),
        h(
          "nav",
          { className: "header-nav", style: styles.headerNav },
          h(
            "a",
            {
              href: "/",
              className: "header-nav-link",
              style: styles.headerNavLink,
            },
            "Home"
          ),
          h(
            "a",
            {
              href: "/about",
              className: "header-nav-link active",
              style: styles.headerNavLink,
            },
            "About"
          ),
          h(
            "a",
            {
              href: "/docs",
              className: "header-nav-link",
              style: styles.headerNavLink,
            },
            "Docs"
          )
        )
      )
    ),
    h(
      "main",
      { className: "mt-4", style: styles.main },
      h(
        "section",
        { className: "py-4", style: styles.section },
        h("h1", null, "About Elux"),
        h(
          "p",
          null,
          "Elux is a lightweight, TypeScript-first framework designed to provide a modern development experience without React dependencies."
        ),

        h(
          "div",
          { className: "mt-4" },
          h("h2", null, "Our Philosophy"),
          h(
            "p",
            null,
            "We believe in giving developers full control over their stack. By building from scratch, you understand every part of your application and can customize it to your exact needs."
          )
        ),

        h(
          "div",
          { className: "mt-4" },
          h("h2", null, "Key Features"),
          h(
            "ul",
            { style: { paddingLeft: "20px" } },
            h("li", null, "Custom Virtual DOM implementation"),
            h("li", null, "Reactive state management"),
            h("li", null, "File-based routing system"),
            h("li", null, "Server-side rendering"),
            h("li", null, "TypeScript-first architecture"),
            h("li", null, "No heavy dependencies")
          )
        ),

        h(
          "div",
          { className: "mt-4" },
          h(
            "a",
            {
              href: "/",
              className: "btn btn-primary",
              style: styles.button,
              onClick: handleNavigation,
            },
            "Back to Home"
          )
        )
      )
    ),
    h(
      "footer",
      { className: "footer", style: styles.footer },
      h(
        "div",
        { className: "footer-inner", style: styles.footerInner },
        h("div", null, `© ${new Date().getFullYear()} Elux Framework`),
        h(
          "div",
          { className: "footer-links", style: styles.footerLinks },
          h(
            "a",
            {
              href: "https://github.com",
              className: "footer-link",
              style: styles.footerLink,
            },
            "GitHub"
          ),
          h(
            "a",
            {
              href: "/docs",
              className: "footer-link",
              style: styles.footerLink,
            },
            "Documentation"
          )
        )
      )
    )
  );
}

// Default styles
function getDefaultStyles() {
  return {
    container: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "0 1rem",
    },
    header: {
      backgroundColor: "#333",
      color: "white",
      padding: "1rem 0",
    },
    headerInner: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerLogo: {
      fontSize: "1.5rem",
      fontWeight: "bold",
      textDecoration: "none",
      color: "white",
    },
    headerNav: {
      display: "flex",
      gap: "1.5rem",
    },
    headerNavLink: {
      color: "white",
      textDecoration: "none",
    },
    main: {
      marginTop: "2rem",
    },
    section: {
      padding: "2rem 0",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: "1rem",
      marginTop: "2rem",
    },
    card: {
      border: "1px solid #ddd",
      borderRadius: "8px",
      padding: "1.5rem",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
    button: {
      display: "inline-block",
      backgroundColor: "#4a90e2",
      color: "white",
      padding: "0.5rem 1rem",
      borderRadius: "4px",
      textDecoration: "none",
      marginRight: "1rem",
      cursor: "pointer",
      border: "none",
    },
    footer: {
      backgroundColor: "#f5f5f5",
      padding: "1.5rem 0",
      marginTop: "2rem",
    },
    footerInner: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    footerLinks: {
      display: "flex",
      gap: "1rem",
    },
    footerLink: {
      color: "#333",
      textDecoration: "none",
    },
  };
}

// Create our Home page component
function HomePage(props: any) {
  const { title, description, count } = props;
  const styles = getDefaultStyles();

  function handleClick() {
    // Example of event handling
    console.log("Button clicked");
    renderApp({ ...initialState, count: initialState.count + 1 });
  }

  // Try to import the Demo component directly
  try {
    // Import directly from the app directory
    // Since this won't work with a dynamic import in this context,
    // we'll simulate showing the Demo by creating a visual indicator
    const demoElement = h(
      "div",
      {
        style: {
          padding: "20px",
          border: "2px solid #ff0000",
          borderRadius: "8px",
          marginTop: "20px",
          backgroundColor: "#ffeeee",
        },
      },
      h("h2", { style: { color: "#ff0000" } }, "Demo Component"),
      h("p", { style: { fontWeight: "bold" } }, "THIS IS THE DEMO COMPONENT!"),
      h("p", null, "This demo component is directly rendered from entry.ts"),
      h(
        "p",
        null,
        "Edit app/components/Demo.tsx to see changes with a server restart"
      )
    );

    // Modify the main content to include our Demo
    return h(
      "div",
      { className: "container", style: styles.container },
      h(
        "header",
        { className: "header", style: styles.header },
        h(
          "div",
          { className: "header-inner", style: styles.headerInner },
          h(
            "a",
            { href: "/", className: "header-logo", style: styles.headerLogo },
            "Elux"
          ),
          h(
            "nav",
            { className: "header-nav", style: styles.headerNav },
            h(
              "a",
              {
                href: "/",
                className: cx("header-nav-link", "active"),
                style: styles.headerNavLink,
              },
              "Home"
            ),
            h(
              "a",
              {
                href: "/about",
                className: "header-nav-link",
                style: styles.headerNavLink,
                onClick: handleNavigation,
              },
              "About"
            ),
            h(
              "a",
              {
                href: "/docs",
                className: "header-nav-link",
                style: styles.headerNavLink,
              },
              "Docs"
            )
          )
        )
      ),
      h(
        "main",
        { className: "mt-4", style: styles.main },
        h(
          "section",
          { className: "py-4", style: styles.section },
          h("h1", null, "🚀 " + title),
          h("p", null, description),
          h("p", null, `Count: ${count}`),

          // Add the demo component here
          demoElement,

          h(
            "div",
            {
              className: "mt-4 grid",
              style: styles.grid,
            },
            h(
              "div",
              { className: "card", style: styles.card },
              h("h3", null, "💡 Custom Renderer"),
              h(
                "p",
                null,
                "Built with a lightweight VDOM implementation, no React needed."
              )
            ),
            h(
              "div",
              { className: "card", style: styles.card },
              h("h3", null, "🔥 Signal-based State"),
              h("p", null, "Reactive programming with fine-grained updates.")
            ),
            h(
              "div",
              { className: "card", style: styles.card },
              h("h3", null, "⚡ File-based Routing"),
              h("p", null, "Intuitive app directory structure.")
            )
          ),

          h(
            "div",
            { className: "mt-4" },
            h(
              "button",
              {
                className: "btn btn-primary",
                style: styles.button,
                onClick: handleClick,
              },
              "Increment Counter"
            ),
            h(
              "a",
              {
                href: "/about",
                className: "btn btn-outline",
                style: {
                  ...styles.button,
                  backgroundColor: "transparent",
                  color: "#4a90e2",
                  border: "1px solid #4a90e2",
                },
                onClick: handleNavigation,
              },
              "About Us"
            )
          )
        )
      ),
      h(
        "footer",
        { className: "footer", style: styles.footer },
        h(
          "div",
          { className: "footer-inner", style: styles.footerInner },
          h("div", null, `© ${new Date().getFullYear()} Elux Framework`),
          h(
            "div",
            { className: "footer-links", style: styles.footerLinks },
            h(
              "a",
              {
                href: "https://github.com",
                className: "footer-link",
                style: styles.footerLink,
              },
              "GitHub"
            ),
            h(
              "a",
              {
                href: "/docs",
                className: "footer-link",
                style: styles.footerLink,
              },
              "Documentation"
            )
          )
        )
      )
    );
  } catch (error) {
    console.error("Error rendering Demo component:", error);

    // Return the original component if there's an error
    return h(
      "div",
      { className: "container", style: styles.container },
      // ... the rest of the original component (removed for brevity)
      h(
        "div",
        { style: { color: "red" } },
        "Error loading Demo component: " +
          (error instanceof Error ? error.message : String(error))
      )
    );
  }
}

// Handle client-side navigation
function handleNavigation(event: MouseEvent) {
  event.preventDefault();
  const target = event.currentTarget as HTMLAnchorElement;
  const href = target.getAttribute("href");

  if (href) {
    // Update browser URL without reload
    window.history.pushState({}, "", href);
    // Render the new page
    renderCurrentRoute();
  }
}

// Simple navigation function for programmatic use
export function navigate(url: string) {
  window.history.pushState({}, "", url);
  renderCurrentRoute();
}

// Function to render our application
function renderApp(state: typeof initialState) {
  console.log("Rendering app with state:", state);
  renderCurrentRoute(state);
}

// Render the current route
function renderCurrentRoute(state = initialState) {
  const route = getCurrentRoute();
  console.log("Rendering route:", route);

  // Try to load the page component dynamically
  import(`../../app${route === "/" ? "" : route}/page.tsx`)
    .then((module) => {
      if (module && module.default) {
        // Use the imported page component
        console.log("Found page component for route:", route);
        const Component = module.default;
        const pageComponent = Component(state);
        const container = document.getElementById("app");

        if (container) {
          console.log("Mounting imported component to container");
          mount(pageComponent, container);
        } else {
          console.error("App container not found");
        }
      } else {
        console.warn(
          "No page component found, falling back to built-in components"
        );
        fallbackToBuiltInComponents(route, state);
      }
    })
    .catch((error) => {
      console.error("Error loading page component:", error);
      console.warn("Falling back to built-in components");
      fallbackToBuiltInComponents(route, state);
    });
}

// Fallback to the built-in components if dynamic import fails
function fallbackToBuiltInComponents(
  route: string,
  state: typeof initialState
) {
  // Get the component for the current route from hardcoded routes
  const Component = routes[route as keyof typeof routes] || routes["/"];
  const pageComponent = Component(state);
  const container = document.getElementById("app");

  if (container) {
    console.log("Mounting fallback component to container");
    mount(pageComponent, container);
  } else {
    console.error("App container not found");
  }
}

// Listen for back/forward browser navigation
window.addEventListener("popstate", () => {
  renderCurrentRoute();
});

// Initialize the application when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, initializing app");
    renderCurrentRoute();
  });
} else {
  console.log("DOM already loaded, initializing app now");
  renderCurrentRoute();
}
