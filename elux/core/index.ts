/**
 * Elux Framework - Core exports
 * This file exports all the core modules of the framework
 */

// Export VDOM
export * from "./vdom";

// Export Router
export * from "./router";

// Export Signals
export * from "./signals";

// Export JSX Runtime
export * from "./jsx-runtime";

// Framework version
export const VERSION = "1.0.0";

// Framework context
export interface EluxContext {
  isServer: boolean;
  isDev: boolean;
}

// Create the global context
export const eluxContext: EluxContext = {
  isServer: typeof window === "undefined",
  isDev: process.env.NODE_ENV !== "production",
};

// Initialize function
export function initElux() {
  console.log(`[Elux] Initializing framework v${VERSION}`);

  if (eluxContext.isServer) {
    console.log("[Elux] Running in server environment");
  } else {
    console.log("[Elux] Running in browser environment");
  }

  if (eluxContext.isDev) {
    console.log("[Elux] Running in development mode");
  } else {
    console.log("[Elux] Running in production mode");
  }

  return {
    version: VERSION,
    context: eluxContext,
  };
}
