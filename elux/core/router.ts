/**
 * Elux Framework - Modern File-Based Router
 * Handles automatic routing based on the filesystem with dynamic routes
 */

import { VNode } from "./vdom";

// Types
export type RouteParams = Record<string, string>;
export type RouteLoader = () => Promise<any>;

export interface Route {
  path: string;
  loader: RouteLoader;
  pattern: RegExp;
  params?: string[];
}

// Router class
export class Router {
  private routes: Route[] = [];
  private notFoundRoute: Route | null = null;
  private currentPath: string = "/";
  private listeners: Array<() => void> = [];

  constructor() {
    // Set up history handling for the browser
    if (typeof window !== "undefined") {
      // Handle browser back/forward
      window.addEventListener("popstate", () => {
        this.handleLocationChange();
      });

      // Initial path
      this.currentPath = window.location.pathname;
    }
  }

  /**
   * Register a route with the router
   */
  addRoute(path: string, loader: RouteLoader): void {
    // Create the route pattern for matching
    const { pattern, params } = this.createPattern(path);

    this.routes.push({
      path,
      loader,
      pattern,
      params,
    });

    console.log(`[Router] Added route: ${path}`);
  }

  /**
   * Set the 404 not found route
   */
  setNotFoundRoute(loader: RouteLoader): void {
    this.notFoundRoute = {
      path: "*",
      loader,
      pattern: /^.*$/,
    };

    console.log("[Router] Set notFound route");
  }

  /**
   * Match a URL to a route and get the parameters
   */
  match(url: string): { route: Route; params: RouteParams } {
    const path = this.normalizePath(url);

    // Try to match a route
    for (const route of this.routes) {
      const match = path.match(route.pattern);

      if (match) {
        // Extract parameters from the match
        const params: RouteParams = {};

        if (route.params) {
          for (let i = 0; i < route.params.length; i++) {
            params[route.params[i]] = match[i + 1] || "";
          }
        }

        return { route, params };
      }
    }

    // Return the not found route if no match
    if (this.notFoundRoute) {
      return { route: this.notFoundRoute, params: {} };
    }

    throw new Error(`No route found for ${url} and no notFound route set`);
  }

  /**
   * Create a RegExp pattern from a route path
   * Handles dynamic segments like /users/:id
   */
  private createPattern(path: string): { pattern: RegExp; params: string[] } {
    let routePattern = path;
    const params: string[] = [];

    // Find parameters in the route path
    const paramMatches = path.match(/:[a-zA-Z0-9_]+/g) || [];

    // Replace each parameter with a capture group
    paramMatches.forEach((param) => {
      const paramName = param.substring(1);
      params.push(paramName);
      routePattern = routePattern.replace(param, "([^/]+)");
    });

    // Replace optional trailing slash
    routePattern = routePattern.replace(/\/$/, "/?");

    // Create the RegExp
    const pattern = new RegExp(`^${routePattern}$`);

    return { pattern, params };
  }

  /**
   * Normalize a URL path
   */
  private normalizePath(url: string): string {
    // Remove query parameters and hash
    const path = url.split("?")[0].split("#")[0];

    // Ensure leading slash
    return path.startsWith("/") ? path : `/${path}`;
  }

  /**
   * Handle browser location change
   */
  private handleLocationChange(): void {
    // Update current path
    this.currentPath = window.location.pathname;

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Notify listeners of route change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Navigate to a new route
   */
  navigate(to: string): void {
    if (typeof window === "undefined") return;

    const newPath = this.normalizePath(to);

    if (newPath === this.currentPath) return;

    // Update history
    window.history.pushState({}, "", newPath);

    // Update current path
    this.currentPath = newPath;

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Get the current path
   */
  getCurrentPath(): string {
    return this.currentPath;
  }

  /**
   * Subscribe to route changes
   * Returns unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Load routes from a routes object
   */
  loadRoutes(routes: Record<string, () => Promise<any>>): void {
    // Clear existing routes
    this.routes = [];

    // Add each route
    for (const [path, loader] of Object.entries(routes)) {
      if (path === "*") {
        this.setNotFoundRoute(loader);
      } else {
        this.addRoute(path, loader);
      }
    }
  }
}

// Create a singleton router instance
export const router = new Router();
