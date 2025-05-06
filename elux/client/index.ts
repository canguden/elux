/**
 * Elux Client Entry Point
 * This file is the main entry point for the client-side app
 */

import { initElux } from "../core/runtime";
import { print } from "../core/utils";

// Wait for DOM to be ready before initializing
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initClient);
} else {
  initClient();
}

// Initialize the client app
function initClient() {
  print("[Client] Initializing Elux client...");

  // Make sure we have the root element
  const appRoot = document.getElementById("app");
  if (!appRoot) {
    // Create the root element if it doesn't exist
    const newRoot = document.createElement("div");
    newRoot.id = "app";
    document.body.appendChild(newRoot);
    print("[Client] Created missing #app root element");
  }

  // Initialize the Elux framework
  initElux({
    appRoot: "#app",
    initialState: {
      count: 0,
      title: "Elux Framework",
      isLoading: false,
      error: null,
      currentRoute: window.location.pathname,
    },
  });

  print("[Client] Elux client initialized");
}

// Export client-side rendering functions
export {
  h,
  jsx,
  createElement,
  createText,
  mount,
  update,
  VNodeType,
  getCurrentComponent,
  setCurrentComponent,
  renderClientComponent,
  reRenderComponent,
} from "./renderer";

// Export client runtime
export { initClient, hydrateDocument, renderApp } from "./client";

// Export client-side routing
export { navigate, redirect, initRouter } from "./fileRouter";

// Export JSX runtime
export * from "./jsx-runtime";
