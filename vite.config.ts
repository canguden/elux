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

  return {
    name: "elux-file-router",
    enforce: "pre",
    async buildStart() {
      await scanAndGenerateRoutes();
    },

    configureServer(server) {
      // Define the function to scan and generate routes
      scanAndGenerateRoutes = async () => {
        console.log("🔍 Scanning for routes in app directory...");

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
            console.log(`📄 Route: ${routePath} -> ${importPath}`);
          }

          // Generate the routes file
          const file = `// Auto-generated routes file - DO NOT EDIT
export const routes = {
${Object.entries(routes)
  .map(([path, file]) => `  "${path}": () => import("${file}")`)
  .join(",\n")}
};
`;

          // Ensure the directory exists
          const routesFilePath = resolve("elux/routes.ts");
          fs.writeFileSync(routesFilePath, file);
          console.log(`✅ Routes generated at ${routesFilePath}`);
        } catch (error) {
          console.error("❌ Error generating routes:", error);
        }
      };

      // Run the initial scan
      scanAndGenerateRoutes();

      // Set up file watchers for route changes
      server.watcher.on("add", (path) => {
        if (path.includes("/app/") && path.endsWith("page.tsx")) {
          scanAndGenerateRoutes();
        }
      });

      server.watcher.on("unlink", (path) => {
        if (path.includes("/app/") && path.endsWith("page.tsx")) {
          scanAndGenerateRoutes();
        }
      });
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
