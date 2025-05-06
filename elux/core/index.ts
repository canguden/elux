/**
 * Elux Core Module
 * Central export point for core functionality
 */

// Export core modules
export * from "./vdom";
export * from "./context";
export * from "./router";
export * from "./components";

// Export signals API
export * from "./signals";

// Export helper utilities
export * from "./utils";

// Export runtime system
export * from "./runtime";

// Export route builder
export { buildRoutes, generateRouteMap } from "./routeBuilder";

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
