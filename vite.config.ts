import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";
import path from "path";
import { Plugin } from "vite";
import fg from "fast-glob";

// File Router Plugin that scans the app directory and generates routes
function eluxFileRouterPlugin(): Plugin {
  // Store references to methods outside of plugin scope
  let scanAndGenerateRoutes: () => Promise<void>;

  // Check verbose logging mode
  const VERBOSE_LOGGING = process.env.VERBOSE_LOGGING === "true";

  // Track the last routes for comparison
  let lastRoutes: Record<string, string> = {};

  // Debounce route scanning to prevent excessive disk I/O
  let scanTimeout: NodeJS.Timeout | null = null;
  const debounceScan = (delay = 300) => {
    if (scanTimeout) {
      clearTimeout(scanTimeout);
    }

    return new Promise<void>((resolve) => {
      scanTimeout = setTimeout(async () => {
        await scanAndGenerateRoutes();
        resolve();
      }, delay);
    });
  };

  return {
    name: "elux-file-router",
    enforce: "pre",
    async buildStart() {
      await scanAndGenerateRoutes();
    },

    configureServer(server) {
      // Define the function to scan and generate routes
      scanAndGenerateRoutes = async () => {
        // Only log in verbose mode
        if (VERBOSE_LOGGING) {
          console.log("🔍 Scanning for routes in app directory...");
        }

        try {
          // Find all page.tsx files in the app directory
          const pages = await fg("app/**/page.{tsx,ts,jsx,js}");
          const routes: Record<string, string> = {};

          for (const page of pages) {
            // Convert file path to route path
            const route = page
              .replace(/^app/, "")
              .replace(/\/page\.(tsx|ts|jsx|js)$/, "")
              .replace(/^\/+/, "");

            // Format the final route
            const routePath = route === "" ? "/" : `/${route}`;
            const importPath = `/${page.replace(/\.(tsx|ts|jsx|js)$/, "")}`;

            routes[routePath] = importPath;

            // Only log in verbose mode
            if (VERBOSE_LOGGING) {
              console.log(`📄 Route: ${routePath} -> ${importPath}`);
            }
          }

          // Check if routes have changed
          const routesChanged =
            JSON.stringify(routes) !== JSON.stringify(lastRoutes);

          if (routesChanged) {
            // Generate the routes file with safer dynamic imports
            const file = `// Auto-generated routes file - DO NOT EDIT
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
          div.innerHTML = "<h1>Error Loading Not Found Page</h1><p>The 404 page itself could not be loaded.</p>";
          return div;
        }

        // For all other pages, let the fileRouter handle showing the not-found page
        // by returning null - the router will detect this and use the not-found page
        console.warn("Route module failed to load, letting router handle the 404 page");
        return null;
      }
    };
  }
}

export const routes = {
${Object.entries(routes)
  .map(([path, file]) => `  "${path}": () => safeImport("${file}")`)
  .join(",\n")}
};
`;

            // Ensure the directory exists
            const routesFilePath = resolve("elux/routes.ts");
            fs.writeFileSync(routesFilePath, file);

            // Update the last routes
            lastRoutes = { ...routes };

            // Only log in verbose mode
            if (VERBOSE_LOGGING) {
              console.log(
                `✅ Routes generated at ${routesFilePath} with ${
                  Object.keys(routes).length
                } routes`
              );
            } else {
              process.stdout.write(".");
            }

            // Force HMR update for routes file to notify clients
            try {
              const routesModule =
                server.moduleGraph.getModuleById(routesFilePath);
              if (routesModule) {
                server.moduleGraph.invalidateModule(routesModule);
                server.ws.send({
                  type: "full-reload",
                });
              }
            } catch (hmrError) {
              console.error("❌ Error triggering HMR update:", hmrError);
            }
          } else if (VERBOSE_LOGGING) {
            console.log("ℹ️ No changes in routes detected");
          }
        } catch (error) {
          console.error("❌ Error generating routes:", error);
        }
      };

      // Run the initial scan
      scanAndGenerateRoutes();

      // Set up file watchers for route changes with pattern matching for different file types
      const routeFilePattern = /\/app\/.*page\.(tsx|ts|jsx|js)$/;

      // Use a single watcher for all file changes
      server.watcher.on("all", async (eventType, path) => {
        if (routeFilePattern.test(path)) {
          if (VERBOSE_LOGGING) {
            console.log(`📁 ${eventType} detected for route file: ${path}`);
          }

          // For deleted files, we need to make sure they're removed from routes quickly
          if (eventType === "unlink") {
            // Immediate update for deletions to avoid HMR errors
            await scanAndGenerateRoutes();
          } else {
            // Debounce the scan to avoid multiple scans for other operations
            await debounceScan();
          }
        }
      });
    },

    // Handle dynamic imports for routes that might not exist
    handleHotUpdate({ file, server }) {
      // If routes.ts changed, force reload the page to avoid HMR errors
      if (file.endsWith("routes.ts")) {
        server.ws.send({
          type: "full-reload",
          path: "*",
        });
        return [];
      }
      return;
    },

    // Add a virtual module for route fallbacks
    resolveId(id) {
      if (
        id.startsWith("/app/") &&
        id.endsWith("/page") &&
        !fs.existsSync(id.slice(1) + ".tsx")
      ) {
        // If trying to resolve a non-existent page, provide a virtual module
        return id + "?virtual";
      }
      return null;
    },

    load(id) {
      if (id.endsWith("/page?virtual")) {
        // Provide fallback content for missing pages
        const originalPath = id.replace("?virtual", "");
        console.log(
          `Providing virtual module for missing route: ${originalPath}`
        );

        // Check if not-found page exists
        const notFoundPath = path.join(process.cwd(), "app/notfound/page.tsx");
        const hasNotFoundPage = fs.existsSync(notFoundPath);

        if (hasNotFoundPage) {
          // Render not-found page directly without redirect
          return `
            import NotFoundPage from "/app/notfound/page";
            
            // Virtual module for missing route that renders Not Found component directly
            export default function VirtualNotFoundPage(props) {
              // Pass the path to the not-found page
              return NotFoundPage({ ...props, params: { path: "${originalPath}" } });
            }
          `;
        } else {
          // Fallback to redirect if no not-found page exists
          return `
            import { h } from "/elux/core/vdom";
            import { redirect } from "/elux/client/fileRouter";
            
            // Fallback component for missing route
            export default function MissingPage() {
              // Auto-redirect to home page after a brief delay
              setTimeout(() => redirect("/", { delay: 10 }), 10);
              
              return h('div', { className: 'container py-4' }, [
                h('h1', { className: 'text-xl font-bold mb-4' }, 'Page Not Found'),
                h('p', { className: 'mb-4' }, 'The requested page no longer exists.'),
                h('p', { className: 'mb-4' }, 'Redirecting to home page...')
              ]);
            }
          `;
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname),
      app: resolve(__dirname, "app"),
      elux: resolve(__dirname, "elux"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  esbuild: {
    jsx: "transform",
    jsxFactory: "h",
    jsxFragment: "Fragment",
  },
  optimizeDeps: {
    esbuildOptions: {
      jsx: "transform",
      jsxFactory: "h",
      jsxFragment: "Fragment",
    },
    include: ["express"],
  },
  server: {
    port: 3000,
    hmr: {
      protocol: "ws",
      host: "localhost",
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
      output: {
        manualChunks: {
          vendor: ["express"],
        },
      },
    },
  },
  css: {
    devSourcemap: true,
  },
  plugins: [eluxFileRouterPlugin()],
});
