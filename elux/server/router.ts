import fs from "fs";
import path from "path";
import { VNode } from "../client/renderer";

// Types for route definitions
export interface RouteParams {
  [key: string]: string;
}

export interface RouteMatch {
  route: Route;
  params: RouteParams;
}

export interface Route {
  path: string;
  pattern: RegExp;
  component: () => Promise<{ default: any }>;
  layout?: () => Promise<{ default: any }>;
  meta: RouteMeta;
}

// Client-side serializable route definition
export interface ClientRoute {
  path: string;
  componentPath: string;
  meta: RouteMeta;
}

export interface RouteMeta {
  ssr?: boolean;
  ssg?: boolean;
  revalidate?: number;
  authRequired?: boolean;
}

// Default route metadata
const DEFAULT_META: RouteMeta = {
  ssr: true,
  ssg: false,
  revalidate: 0,
  authRequired: false,
};

// Router class for managing routes
export class Router {
  private routes: Route[] = [];
  private notFoundRoute: Route | null = null;

  constructor() {
    // Initialize with 404 route
    this.notFoundRoute = {
      path: "*",
      pattern: /^.*$/,
      component: () =>
        Promise.resolve({
          default: () => ({
            type: "div",
            props: { className: "error-page" },
            children: ["Page not found"],
          }),
        }),
      meta: { ...DEFAULT_META },
    };
  }

  // Add a new route to the router
  addRoute(route: Route): void {
    this.routes.push(route);
  }

  // Set the custom 404 route
  setNotFoundRoute(route: Route): void {
    this.notFoundRoute = route;
  }

  // Match a URL path to a route
  match(url: string): RouteMatch {
    // Extract the pathname from the URL
    const pathname = new URL(url, "http://localhost").pathname;

    console.log("Matching path:", pathname);

    // Simple check for the root path
    if (pathname === "/") {
      // Find the root route
      const rootRoute = this.routes.find((route) => route.path === "/");
      if (rootRoute) {
        console.log("Found root route");
        return { route: rootRoute, params: {} };
      }
    }

    // Try to match a route
    for (const route of this.routes) {
      console.log(
        "Testing route:",
        route.path,
        "with pattern:",
        route.pattern.toString()
      );
      const match = pathname.match(route.pattern);

      if (match) {
        console.log("Route matched:", route.path);
        const params: RouteParams = {};

        // Extract named parameters from the route
        const pathParts = route.path.split("/");
        const urlParts = pathname.split("/");

        for (let i = 0; i < pathParts.length; i++) {
          const part = pathParts[i];
          if (part.startsWith(":")) {
            const paramName = part.substring(1);
            params[paramName] = urlParts[i];
          }
        }

        return { route, params };
      }
    }

    console.log("No route matched, returning 404");
    // Return the not found route if no match
    return {
      route: this.notFoundRoute!,
      params: {},
    };
  }

  // Get a serializable version of routes for client-side use
  getClientRoutes(): ClientRoute[] {
    const clientRoutes: ClientRoute[] = this.routes.map((route) => {
      // Get the component path by extracting it from the import function
      // This is a hack that relies on the format of the dynamic import in the route component
      let componentPath = "";
      try {
        const funcStr = route.component.toString();
        const importMatch = funcStr.match(/import\(\s*['"](.+)['"]\s*\)/);
        if (importMatch && importMatch[1]) {
          componentPath = importMatch[1].replace(
            /\/\* @vite-ignore \*\/\s*/,
            ""
          );
        }
      } catch (error) {
        console.error("Failed to extract component path", error);
      }

      return {
        path: route.path,
        componentPath,
        meta: route.meta,
      };
    });

    if (this.notFoundRoute) {
      clientRoutes.push({
        path: "*",
        componentPath: "/_404", // Client-side reference for 404 page
        meta: this.notFoundRoute.meta,
      });
    }

    return clientRoutes;
  }

  // Scan the app directory and create routes from files
  async scanRoutes(appDir: string): Promise<void> {
    this.routes = await this.buildRoutesFromFiles(appDir);
  }

  // Recursively build routes from the file system
  private async buildRoutesFromFiles(
    rootDir: string,
    prefix = ""
  ): Promise<Route[]> {
    const routes: Route[] = [];
    const appDir = path.join(process.cwd(), rootDir);

    // Check if the directory exists
    if (!fs.existsSync(appDir)) {
      console.warn(`Directory not found: ${appDir}`);
      return routes;
    }

    // Scan directories and files
    const entries = fs.readdirSync(appDir, { withFileTypes: true });

    // Process page files and directories
    for (const entry of entries) {
      const entryPath = path.join(appDir, entry.name);

      if (entry.isDirectory()) {
        // Skip special directories
        if (
          entry.name.startsWith("_") ||
          entry.name === "components" ||
          entry.name === "ui"
        ) {
          continue;
        }

        // Get routes from subdirectory
        const nestedPrefix = prefix
          ? `${prefix}/${entry.name}`
          : `/${entry.name}`;
        const nestedRoutes = await this.buildRoutesFromFiles(
          path.join(rootDir, entry.name),
          nestedPrefix
        );

        routes.push(...nestedRoutes);
      } else if (entry.isFile()) {
        // Check for page files
        if (
          entry.name === "page.tsx" ||
          entry.name === "page.ts" ||
          entry.name === "page.js"
        ) {
          const routePath = prefix || "/";
          const pattern = this.createRoutePattern(routePath);

          // Create route
          const route: Route = {
            path: routePath,
            pattern,
            component: () =>
              import(/* @vite-ignore */ path.join(rootDir, prefix, entry.name)),
            meta: { ...DEFAULT_META },
          };

          // Check for layout file
          const layoutPath = path.join(appDir, "_layout.tsx");
          if (fs.existsSync(layoutPath)) {
            route.layout = () =>
              import(
                /* @vite-ignore */ path.join(rootDir, prefix, "_layout.tsx")
              );
          }

          // Check for meta file
          const metaPath = path.join(appDir, "_meta.json");
          if (fs.existsSync(metaPath)) {
            try {
              const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
              route.meta = { ...DEFAULT_META, ...meta };
            } catch (error) {
              console.error(`Error parsing meta file at ${metaPath}:`, error);
            }
          }

          routes.push(route);
        }

        // Check for dynamic route segments with [...param].tsx format
        if (entry.name.match(/^\[\.\.\.(\w+)\]\.tsx$/)) {
          const param = entry.name.match(/^\[\.\.\.(\w+)\]\.tsx$/)![1];
          const routePath = `${prefix}/*`;
          const pattern = new RegExp(`^${prefix.replace(/\//g, "\\/")}\/(.*)$`);

          routes.push({
            path: routePath,
            pattern,
            component: () =>
              import(/* @vite-ignore */ path.join(rootDir, prefix, entry.name)),
            meta: { ...DEFAULT_META },
          });
        }

        // Check for dynamic route segments with [param].tsx format
        if (entry.name.match(/^\[(\w+)\]\.tsx$/)) {
          const param = entry.name.match(/^\[(\w+)\]\.tsx$/)![1];
          const routePath = `${prefix}/:${param}`;
          const pattern = this.createRoutePattern(routePath);

          routes.push({
            path: routePath,
            pattern,
            component: () =>
              import(/* @vite-ignore */ path.join(rootDir, prefix, entry.name)),
            meta: { ...DEFAULT_META },
          });
        }
      }
    }

    return routes;
  }

  // Convert a path pattern to a regular expression
  private createRoutePattern(routePath: string): RegExp {
    const pattern = routePath
      .replace(/\/:[^/]+/g, "/([^/]+)")
      .replace(/\//g, "\\/");

    return new RegExp(`^${pattern}$`);
  }
}

// Export a singleton router instance
export const router = new Router();
