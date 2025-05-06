/**
 * Elux Framework - Route Builder
 * Scans app directory to generate routes based on file system structure
 */

import fs from "fs";
import path from "path";
import { print } from "./utils";

// Route component type
export type RouteComponent = () => Promise<{ default: any }>;

// Route definition interface
export interface RouteNode {
  path: string;
  component?: RouteComponent;
  layout?: RouteComponent;
  children?: RouteNode[];
  isDynamic?: boolean;
}

/**
 * Normalize path segment for routing
 * Transforms [param] to :param for express-style path params
 */
function normalizePath(segment: string): string {
  if (
    segment === "page.tsx" ||
    segment === "page.ts" ||
    segment === "layout.tsx" ||
    segment === "layout.ts"
  ) {
    return "";
  }

  // Handle dynamic routes with [param] syntax
  if (segment.startsWith("[") && segment.endsWith("]")) {
    return `:${segment.slice(1, -1)}`;
  }

  return segment;
}

/**
 * Build route tree by scanning directory
 */
export function buildRoutes(dir: string, base = ""): RouteNode[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    const node: RouteNode = {
      path: base,
      children: [],
    };

    // Check if this directory has page or layout files
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (!entry.isDirectory()) {
        // Handle page files
        if (entry.name === "page.tsx" || entry.name === "page.ts") {
          const routePath = `/${base}`.replace(/\/+/g, "/");
          node.component = () => import(/* @vite-ignore */ fullPath);
          node.path =
            routePath === "/" ? routePath : routePath.replace(/\/$/, "");
        }
        // Handle layout files
        else if (entry.name === "layout.tsx" || entry.name === "layout.ts") {
          node.layout = () => import(/* @vite-ignore */ fullPath);
        }
      }
    }

    // Process subdirectories
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dir, entry.name);
        const segment = normalizePath(entry.name);
        const childPath = segment ? path.join(base, segment) : base;

        // Handle special directory names
        const isDynamic =
          entry.name.startsWith("[") && entry.name.endsWith("]");

        const children = buildRoutes(fullPath, childPath);
        if (children.length) {
          node.children!.push(...children);

          // Mark routes with dynamic segments
          if (isDynamic) {
            children.forEach((child) => {
              child.isDynamic = true;
            });
          }
        }
      }
    }

    // Return node if it has component/layout or children
    return node.component ||
      node.layout ||
      (node.children && node.children.length > 0)
      ? [node]
      : [];
  } catch (error) {
    print(`Error building routes for ${dir}: ${error}`);
    return [];
  }
}

/**
 * Generate flat route map for use in fileRouter
 */
export function generateRouteMap(
  appDir: string
): Record<string, () => Promise<any>> {
  const routes: Record<string, () => Promise<any>> = {};
  const routeTree = buildRoutes(appDir);

  // Helper function to recursively add routes
  function addRoutes(nodes: RouteNode[]): void {
    for (const node of nodes) {
      if (node.component) {
        // Convert path to route key
        const routeKey = node.path || "/";
        routes[routeKey] = node.component;
      }

      if (node.children && node.children.length > 0) {
        addRoutes(node.children);
      }
    }
  }

  addRoutes(routeTree);

  // Try to add notfound page if it exists
  try {
    const notFoundPath = path.join(appDir, "notfound.tsx");
    if (fs.existsSync(notFoundPath)) {
      routes["/notfound"] = () => import(/* @vite-ignore */ notFoundPath);
    } else {
      const altNotFoundPath = path.join(appDir, "notfound.ts");
      if (fs.existsSync(altNotFoundPath)) {
        routes["/notfound"] = () => import(/* @vite-ignore */ altNotFoundPath);
      }
    }
  } catch (e) {
    print(`Error adding notfound route: ${e}`);
  }

  return routes;
}
