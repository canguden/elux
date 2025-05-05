import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import chalk from "chalk";

// Get current directory
// const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Get port from environment or use default
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DEV_MODE = process.env.NODE_ENV !== "production";
const VERBOSE_LOGGING = process.env.VERBOSE_LOGGING === "true";

// Console logging utilities with emojis
const logger = {
  info: (message: string) => console.log(`${chalk.blue("ℹ️")} ${message}`),
  success: (message: string) => console.log(`${chalk.green("✅")} ${message}`),
  warning: (message: string) => console.log(`${chalk.yellow("⚠️")} ${message}`),
  error: (message: string) => console.log(`${chalk.red("❌")} ${message}`),
  debug: (message: string) => false, // Disable debug logging completely
  route: (method: string, url: string) =>
    DEV_MODE &&
    console.log(`${chalk.magenta("🔌")} ${chalk.bold(method)} ${url}`),
};

// Scan app directory and generate routes dynamically
async function generateRoutes() {
  const appDir = path.join(process.cwd(), "app");

  // Hold all discovered routes
  const routes: Record<string, string> = {
    "/": "/app/page",
  };

  // Function to recursively scan directories
  function scanDirectory(dir: string, routePrefix: string = "") {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      // Check for page.tsx in current directory
      const hasPage = entries.some(
        (entry) =>
          entry.isFile() &&
          (entry.name === "page.tsx" || entry.name === "page.jsx")
      );

      if (hasPage) {
        const routePath = routePrefix || "/";
        routes[routePath] = `${dir.replace(process.cwd(), "")}/page`.replace(
          /\\/g,
          "/"
        );
        // Completely eliminate debug logs for routes
      }

      // Recursively scan subdirectories
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !entry.name.startsWith("_") &&
          !entry.name.startsWith(".")
        ) {
          const newRoutePrefix = `${routePrefix}/${entry.name}`.replace(
            /\/+/g,
            "/"
          );
          scanDirectory(path.join(dir, entry.name), newRoutePrefix);
        }
      }
    } catch (err) {
      logger.error(`Error scanning directory ${dir}: ${err}`);
    }
  }

  // Start scanning from app directory
  scanDirectory(appDir);

  // Add notfound route if it exists
  const notFoundPath = path.join(appDir, "notfound", "page.tsx");
  if (fs.existsSync(notFoundPath)) {
    routes["/notfound"] = "/app/notfound/page";
  }

  // Generate routes.ts file
  const routesFileContent = `// Auto-generated routes file - DO NOT EDIT
export const routes = {
${Object.entries(routes)
  .map(([route, path]) => `  "${route}": () => import("${path}")`)
  .join(",\n")}
};
`;

  // Write to routes.ts
  fs.writeFileSync(
    path.join(process.cwd(), "elux", "routes.ts"),
    routesFileContent
  );

  // Keep the terminal clean - no logs at all for route generation
  return routes;
}

// Request timer middleware
const requestTimer = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (DEV_MODE) {
    // Filter out frequent polling requests from timing logs
    const shouldSkipLogging =
      req.url.includes("/__elux/api/routes") ||
      req.url.includes("/.well-known/appspecific") ||
      req.url.includes("/favicon.ico");

    if (!shouldSkipLogging) {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        const color =
          duration < 50
            ? chalk.green
            : duration < 200
            ? chalk.yellow
            : chalk.red;
        logger.debug(`${req.method} ${req.url} - ${color(duration + "ms")}`);
      });
    }
  }
  next();
};

// Declare global namespace augmentation for vite
declare global {
  var vite: any;
}

// Load a module dynamically
async function importModule(modulePath: string) {
  try {
    // For development mode, use Vite to process the module
    if (DEV_MODE && global.vite) {
      const resolved = await global.vite.ssrLoadModule(modulePath);
      return resolved;
    }

    // In production, load compiled modules
    // Ensure we're using file:// protocol for ESM imports
    const fileUrl = pathToFileURL(modulePath).href;
    return await import(fileUrl);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to import module ${modulePath}: ${errorMessage}`);
    return null;
  }
}

// Convert file path to file URL
function pathToFileURL(filePath: string): URL {
  let url = new URL(`file://${filePath}`);

  // Ensure correct format on Windows
  if (process.platform === "win32") {
    url = new URL(`file:///${filePath.replace(/\\/g, "/")}`);
  }

  return url;
}

// Render a page with its layout
async function renderPage(pagePath: string, params: Record<string, any> = {}) {
  try {
    logger.debug(`Rendering page from path: ${pagePath}`);

    // Import the page component
    const pageModule = await importModule(pagePath);
    if (!pageModule || !pageModule.default) {
      throw new Error(`No default export found in ${pagePath}`);
    }

    // Import the nearest layout component
    const layoutPath = path.join(path.dirname(pagePath), "layout.tsx");
    let layoutModule = null;

    if (fs.existsSync(layoutPath)) {
      layoutModule = await importModule(layoutPath);
    } else {
      // If no layout in current directory, try parent directories up to app/layout.tsx
      const rootLayoutPath = path.join(process.cwd(), "app", "layout.tsx");
      if (fs.existsSync(rootLayoutPath)) {
        layoutModule = await importModule(rootLayoutPath);
      }
    }

    // Get page props if getServerSideProps exists
    let pageProps = {};
    if (pageModule.getServerSideProps) {
      try {
        const result = await pageModule.getServerSideProps({
          params,
          isSSR: true,
          isSSG: false,
        });
        pageProps = result.props || {};
      } catch (error) {
        if (DEV_MODE) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error(`Error in getServerSideProps: ${errorMessage}`);
          return `
            <div style="
              padding: 20px;
              margin: 20px;
              border: 2px solid #e53e3e;
              border-radius: 5px;
              background-color: #fff5f5;
              color: #e53e3e;
              font-family: -apple-system, system-ui, sans-serif;
            ">
              <h2>Error in getServerSideProps</h2>
              <pre style="
                background: #f8f8f8;
                padding: 10px;
                border-radius: 4px;
                overflow-x: auto;
              ">${errorMessage}\n${
            error instanceof Error ? error.stack : ""
          }</pre>
            </div>
          `;
        }
        // In production, continue with empty props
        pageProps = {};
      }
    }

    // Get layout props if getLayoutProps exists
    let layoutProps = {};
    if (layoutModule && layoutModule.getLayoutProps) {
      try {
        const result = await layoutModule.getLayoutProps({
          params,
          isSSR: true,
          isSSG: false,
        });
        layoutProps = result.props || {};
      } catch (error) {
        if (DEV_MODE) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error(`Error in getLayoutProps: ${errorMessage}`);
        }
        // Continue with empty layout props
        layoutProps = {};
      }
    }

    // Import the renderToString function from elux
    const eluxCore = await importModule(
      path.join(process.cwd(), "elux", "core.ts")
    );

    if (!eluxCore || typeof eluxCore.renderToString !== "function") {
      throw new Error(
        `renderToString function not found in elux/core.ts - got: ${JSON.stringify(
          Object.keys(eluxCore || {})
        )}`
      );
    }

    const { renderToString } = eluxCore;

    // Render the page component
    try {
      // For debugging
      logger.debug(`Calling page component: ${pagePath}`);

      // Generate page component with the page props
      let pageComponent;
      try {
        pageComponent = pageModule.default(pageProps);
        logger.debug(`Page component type: ${typeof pageComponent}`);
      } catch (componentError) {
        logger.error(`Error creating page component: ${componentError}`);
        throw componentError;
      }

      // Wrap with layout if available, otherwise just return the page
      let content;
      if (layoutModule && layoutModule.default) {
        try {
          content = layoutModule.default({
            children: pageComponent,
            ...layoutProps,
          });
          logger.debug(`Layout component type: ${typeof content}`);
        } catch (layoutError) {
          logger.error(`Error creating layout component: ${layoutError}`);
          content = pageComponent; // Fall back to page without layout
        }
      } else {
        content = pageComponent;
      }

      // Debug info for the content
      logger.debug(`Content before rendering: type=${typeof content}`);
      if (typeof content === "object" && content !== null) {
        logger.debug(`Content object type: ${content.type}`);
      }

      // Properly render the VDOM to HTML
      let renderedHTML;

      try {
        // Convert the component to HTML
        renderedHTML = await renderToString(content);

        if (DEV_MODE) {
          logger.debug(`Rendered HTML length: ${renderedHTML?.length || 0}`);
          logger.debug(
            `Rendered HTML starts with: ${renderedHTML?.substring(0, 50)}`
          );
        }
      } catch (renderError) {
        logger.error(`Error during renderToString: ${renderError}`);
        throw renderError;
      }

      // If renderToString fails or returns empty, show a helpful error
      if (!renderedHTML || renderedHTML.trim() === "") {
        logger.error("Failed to render component to HTML");
        renderedHTML = `
          <div style="color: red; padding: 16px; border: 1px solid red; margin: 16px 0;">
            <h3>Render Error</h3>
            <p>The component could not be rendered to HTML.</p>
            <p>This usually happens when the component structure doesn't match the expected VDOM format.</p>
            <pre>${JSON.stringify(content, null, 2)}</pre>
          </div>
        `;
      }

      // Create hydration script with initial data
      const initialData = {
        ...pageProps,
        ...layoutProps,
        route: params.route || "/",
      };

      // Add state hydration script
      const hydrationScript = `
        <script>
          window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};
        </script>
      `;

      // Generate the full HTML page
      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <title>${(pageProps as any).title || "Elux App"}</title>
            <link rel="stylesheet" href="/styles/globals.css" type="text/css" />
            ${hydrationScript}
          </head>
          <body>
            <div id="app">${renderedHTML}</div>
            <script type="module" src="/elux/runtime.tsx"></script>
          </body>
        </html>
      `;

      return html;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error rendering component: ${errorMessage}`);

      // Return error page
      return `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <title>Error - Elux App</title>
            <link rel="stylesheet" href="/styles/globals.css" type="text/css" />
          </head>
          <body>
            <div style="
              padding: 20px;
              margin: 20px;
              border: 2px solid #e53e3e;
              border-radius: 5px;
              background-color: #fff5f5;
              color: #e53e3e;
              font-family: -apple-system, system-ui, sans-serif;
            ">
              <h2>Error Rendering Page</h2>
              <p>${errorMessage}</p>
              <pre style="
                background: #f8f8f8;
                padding: 10px;
                border-radius: 4px;
                overflow-x: auto;
              ">${error instanceof Error ? error.stack : ""}</pre>
            </div>
          </body>
        </html>
      `;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error in renderPage: ${errorMessage}`);

    // Return generic error page
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <title>Server Error - Elux App</title>
          <style>
            body { 
              font-family: -apple-system, system-ui, sans-serif; 
              padding: 2rem; 
              max-width: 800px; 
              margin: 0 auto;
            }
            h1 { color: #e53e3e; }
            pre { 
              background: #f1f1f1;
              padding: 1rem;
              border-radius: 4px;
              overflow-x: auto;
            }
          </style>
        </head>
        <body>
          <h1>Server Error</h1>
          <p>${errorMessage}</p>
          <pre>${error instanceof Error ? error.stack : ""}</pre>
        </body>
      </html>
    `;
  }
}

// Handle different routes
async function handleRoute(req: express.Request, res: express.Response) {
  try {
    const route = req.path;
    logger.debug(`Handling route: ${route}`);

    // Ensure Content-Type is set correctly for all routes
    res.setHeader("Content-Type", "text/html");

    // Map route to the corresponding page file
    let pagePath =
      route === "/"
        ? path.join(process.cwd(), "app", "page.tsx")
        : path.join(process.cwd(), "app", route, "page.tsx");

    logger.debug(`Trying to load page from: ${pagePath}`);

    // Check if page file exists
    if (!fs.existsSync(pagePath)) {
      logger.warning(`Page not found for route: ${route}`);

      // Try index.tsx for folder-based routes
      pagePath = path.join(process.cwd(), "app", route, "index.tsx");
      logger.debug(`Trying alternative path: ${pagePath}`);
      if (!fs.existsSync(pagePath)) {
        logger.error(`No page file found for route: ${route}`);
        res.status(404).send(`
          <html>
            <head>
              <title>404 - Page Not Found</title>
              <style>
                body { 
                  font-family: -apple-system, system-ui, sans-serif; 
                  padding: 2rem; 
                  max-width: 800px; 
                  margin: 0 auto;
                }
                h1 { color: #e53e3e; }
              </style>
            </head>
            <body>
              <h1>404 - Page Not Found</h1>
              <p>The page at ${route} could not be found.</p>
              <a href="/">Return to Home</a>
            </body>
          </html>
        `);
        return;
      }
    }

    // Render the page with its layout
    // Include the route information in the params
    const params = { route };
    logger.debug(`Rendering page from: ${pagePath}`);

    // Get the content
    const content = await renderPage(pagePath, params);

    // Send the rendered HTML
    res.send(content);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    logger.error(`Route handling error: ${errorMessage}`);

    // Set content type to ensure proper browser rendering
    res.setHeader("Content-Type", "text/html");

    res.status(500).send(`
      <html>
        <head>
          <title>500 - Server Error</title>
          <style>
            body { 
              font-family: -apple-system, system-ui, sans-serif; 
              padding: 2rem; 
              max-width: 800px; 
              margin: 0 auto;
            }
            h1 { color: #e53e3e; }
            .error-stack { 
              background: #f1f1f1;
              padding: 1rem;
              border-radius: 4px;
              overflow-x: auto;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <h1>500 - Server Error</h1>
          <p>${errorMessage}</p>
          <div class="error-stack">${
            errorStack?.replace(/\n/g, "<br>") || ""
          }</div>
        </body>
      </html>
    `);
  }
}

async function start() {
  try {
    logger.info(
      `Starting Elux ${DEV_MODE ? "development" : "production"} server...`
    );

    // Generate routes from filesystem
    await generateRoutes();

    const app = express();
    let vite: any;

    // In development mode, watch for file changes to regenerate routes
    if (DEV_MODE) {
      const appDir = path.join(process.cwd(), "app");
      const eluxDir = path.join(process.cwd(), "elux");
      let debounceTimer: NodeJS.Timeout | null = null;

      // Create Vite server in middleware mode
      vite = await createViteServer({
        server: {
          middlewareMode: true,
        },
        appType: "custom",
        optimizeDeps: {
          // Add dependencies to pre-bundle
          include: ["express", "path", "fs"],
        },
        build: {
          // Fast refresh settings
          cssCodeSplit: true,
          sourcemap: true,
        },
      });

      // Store vite instance globally for module imports
      global.vite = vite;

      // Use vite's connect instance as middleware
      app.use(vite.middlewares);

      // Enhanced file watcher for the app directory
      fs.watch(appDir, { recursive: true }, async (_eventType, filename) => {
        if (!filename) return;

        // Debounce to avoid multiple events
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
          // Completely silent operation - no logging

          // Regenerate routes if needed
          if (filename.endsWith("page.tsx") || filename.includes("/")) {
            await generateRoutes();
          }

          // Use Vite's built-in HMR system
          if (vite && vite.ws) {
            // For page files, do a full reload
            if (filename.endsWith("page.tsx")) {
              vite.ws.send({
                type: "full-reload",
              });
              // No logging - keep it silent
            } else {
              // For other files, try module update
              vite.ws.send({
                type: "update",
                updates: [
                  {
                    type: "js-update",
                    path: `/${filename}`,
                    acceptedPath: `/${filename}`,
                  },
                ],
              });
              // No logging - keep it silent
            }
          }
        }, 100);
      });

      // Watch framework files too
      fs.watch(eluxDir, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;

        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
          // No logging - keep it silent

          // For framework changes, always do a full reload
          if (vite && vite.ws) {
            vite.ws.send({
              type: "full-reload",
            });
            // No logging - keep it silent
          }
        }, 100);
      });

      // Simplified logging message with no verbose mode references
      logger.info(`File watching enabled.`);
    }

    // Log all requests for debugging, but filter out route polling
    app.use(requestTimer);
    app.use((req, _res, next) => {
      // Filter out frequent polling requests from logging
      const shouldSkipLogging =
        req.url.includes("/__elux/api/routes") ||
        req.url.includes("/.well-known/appspecific") ||
        req.url.includes("/favicon.ico");

      if (!shouldSkipLogging) {
        logger.route(req.method, req.url);
      }
      next();
    });

    // Serve static files with more explicit paths
    app.use(express.static(path.join(process.cwd())));
    app.use("/public", express.static(path.join(process.cwd(), "public")));
    app.use("/styles", express.static(path.join(process.cwd(), "styles")));
    app.use("/elux", express.static(path.join(process.cwd(), "elux")));

    // Custom dev inspector route
    if (DEV_MODE) {
      app.get("/__elux", (_req, res) => {
        logger.debug("Dev inspector accessed");
        // We'll implement the full inspector later
        res.sendFile(path.join(process.cwd(), "elux", "dev", "inspector.html"));
      });

      // API endpoint for getting framework status
      app.get("/__elux/api/status", (_req, res) => {
        res.json({
          version: "0.1.0",
          mode: "development",
          timestamp: Date.now(),
          elux: {
            components: fs.readdirSync(path.join(process.cwd(), "app", "ui"))
              .length,
            routes: fs.existsSync(path.join(process.cwd(), "app"))
              ? fs
                  .readdirSync(path.join(process.cwd(), "app"))
                  .filter(
                    (file) =>
                      file.endsWith(".tsx") ||
                      fs
                        .statSync(path.join(process.cwd(), "app", file))
                        .isDirectory()
                  ).length
              : 0,
          },
        });
      });

      // API endpoint for routes - allows client to refresh routes without reloading
      app.get("/__elux/api/routes", (_req, res) => {
        // Read the routes file
        try {
          const routesFilePath = path.join(process.cwd(), "elux", "routes.ts");
          const routesContent = fs.readFileSync(routesFilePath, "utf-8");

          // Extract route paths using regex
          const routeRegex = /"(\/[^"]*)":/g;
          const routes = [];
          let match;

          while ((match = routeRegex.exec(routesContent)) !== null) {
            routes.push(match[1]);
          }

          res.json({
            routes,
            timestamp: Date.now(),
          });
        } catch (error) {
          res.status(500).json({
            error: "Failed to read routes",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    }

    // Explicitly handle CSS file requests
    app.get("/styles/globals.css", (_req, res) => {
      logger.debug(
        "CSS file requested, serving from: " +
          path.join(process.cwd(), "styles/globals.css")
      );
      // Check if the file exists
      if (fs.existsSync(path.join(process.cwd(), "styles/globals.css"))) {
        res.sendFile(path.join(process.cwd(), "styles/globals.css"));
      } else {
        logger.error(
          "CSS file not found at " +
            path.join(process.cwd(), "styles/globals.css")
        );
        res.status(404).send("CSS file not found");
      }
    });

    // Handle all routes with our route handler
    app.get("/", handleRoute);
    app.get("/about", handleRoute);
    app.get("/docs", handleRoute);

    // Catch-all handler for other routes
    app.get("*", (req, res, next) => {
      // Skip handling of asset files
      if (
        req.url.includes(".css") ||
        req.url.includes(".js") ||
        req.url.includes(".ts") ||
        req.url.includes(".ico") ||
        req.url.includes(".svg") ||
        req.url.includes(".png") ||
        req.url.includes(".jpg")
      ) {
        next();
        return;
      }

      // Handle all other routes with our route handler
      handleRoute(req, res);
    });

    // Error handling middleware
    app.use(
      (
        err: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
      ) => {
        logger.error(`Server error: ${err.message}`);
        res.status(500).send(`
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                padding: 2rem;
                background: #f7f7f7;
                color: #333;
              }
              .error-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                border-left: 5px solid #e53e3e;
              }
              .error-title { color: #e53e3e; }
              .error-stack { 
                background: #f1f1f1;
                padding: 1rem;
                border-radius: 4px;
                overflow-x: auto;
                font-family: monospace;
              }
            </style>
          </head>
          <body>
            <div class="error-container">
              <h1 class="error-title">Server Error</h1>
              <p>${err.message}</p>
              <div class="error-stack">${err.stack?.replace(
                /\n/g,
                "<br>"
              )}</div>
            </div>
          </body>
        </html>
      `);
      }
    );

    // Start the server
    app.listen(PORT, () => {
      // Ultra clean display - just the basics
      console.log("\n");
      console.log(`${chalk.bold("ELUX Framework")}`);
      const separator = "─".repeat(30);
      console.log(chalk.dim(separator));

      logger.success(
        `Server running at ${chalk.blue(`http://localhost:${PORT}`)}`
      );

      if (DEV_MODE) {
        console.log(chalk.dim(`${separator}\n`));
        console.log(`${chalk.yellow("⚡")} Development mode active`);
        console.log(`${chalk.cyan("🔄")} File watching enabled`);
        console.log(
          `${chalk.magenta("🛠️")} Dev tools: ${chalk.blue(
            `http://localhost:${PORT}/__elux`
          )}`
        );
        console.log(`\nPress ${chalk.bold("Ctrl+C")} to stop\n`);
      }
    });
  } catch (error) {
    logger.error(
      `Failed to start server: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Start the server
start();
