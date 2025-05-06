// Export the DebugPanel component
import DebugPanel, { ServerSafeDebugPanel } from "./DebugPanel";
export { DebugPanel, ServerSafeDebugPanel };

// Helper function to check if we're in a browser environment
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// Helper function to check if we're in development mode
export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}

// Force the debug panel to appear - can be called manually
export function forceShowDebugPanel(): void {
  if (typeof window === "undefined") return;

  console.log("[Elux] Forcing debug panel to appear");

  // Only create if it doesn't exist yet
  if (!document.querySelector(".elux-debug-panel")) {
    // Create container for the debug panel
    const container = document.createElement("div");
    container.id = "elux-debug-panel-container";
    document.body.appendChild(container);

    // Create a new script to render our component
    const script = document.createElement("script");
    script.textContent = `
      (function() {
        try {
          const { h } = window.elux.core;
          const DebugPanel = ${DebugPanel.toString()};
          window.elux.core.render(h(DebugPanel, {}), document.getElementById('elux-debug-panel-container'));
          console.log("[Elux] Debug panel rendered successfully");
        } catch (e) {
          console.error("[Elux] Failed to render debug panel:", e);
        }
      })();
    `;
    document.body.appendChild(script);
  }
}

// Auto-initialize if we're in the browser
if (isBrowser() && isDevelopment()) {
  // Add debug panel with a delay to ensure the DOM and framework are ready
  window.addEventListener("DOMContentLoaded", () => {
    // Wait a bit to ensure DOM is ready
    setTimeout(() => {
      // Check if debug panel should be shown by default
      const shouldShowDebugPanel =
        localStorage.getItem("elux-debug-panel") !== "hidden";
      if (shouldShowDebugPanel) {
        forceShowDebugPanel();
      }
    }, 1000);
  });
}
