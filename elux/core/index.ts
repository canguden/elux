/**
 * Elux Core Module
 * Central export point for core functionality
 */

// Export from core modules
export { h } from "./vdom";
export { createPageContext, eState, usePageProps } from "./context";
export { createSignal, createStore } from "./signals";
export * from "./router";

// Export from runtime
export { initElux } from "./runtime";

// Export utility functions
export { print, printError } from "./utils";

// Export types
export type { RouteComponent, RouteNode } from "./routeBuilder";

// SSR types
export interface SSRContext {
  req?: any;
  res?: any;
  params: Record<string, string>;
  url?: string;
  isSSR?: boolean;
  isSSG?: boolean;
}
