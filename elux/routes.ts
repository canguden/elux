// Auto-generated routes file - DO NOT EDIT
// Using safer dynamic imports with error handling

// Helper function to safely import routes with fallback
async function safeImport(path) {
  try {
    return await import(/* @vite-ignore */ path);
  } catch (error) {
    console.error("Error importing route:", path, error);

    // Return a dedicated error component instead of redirecting
    // This ensures we don't redirect for missing routes
    return {
      default: (props) => {
        // If this import is being used by the not-found page specifically, we need to avoid recursive imports
        if (path === "/app/notfound/page") {
          const div = document.createElement("div");
          div.style.padding = "2rem";
          div.style.maxWidth = "600px";
          div.style.margin = "0 auto";
          div.innerHTML =
            "<h1>Error Loading Not Found Page</h1><p>The 404 page itself could not be loaded.</p>";
          return div;
        }

        // For all other pages, let the fileRouter handle showing the not-found page
        // by returning null - the router will detect this and use the not-found page
        console.warn(
          "Route module failed to load, letting router handle the 404 page"
        );
        return null;
      },
    };
  }
}

export const routes = {
  "/": () => safeImport("/app/page"),
  "/about": () => safeImport("/app/about/page"),
  "/docs": () => safeImport("/app/docs/page"),
};
