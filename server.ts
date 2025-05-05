import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import chalk from "chalk";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Get port from environment or use default
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DEV_MODE = process.env.NODE_ENV !== "production";

// Console logging utilities with emojis
const logger = {
  info: (message: string) => console.log(`${chalk.blue("ℹ️")} ${message}`),
  success: (message: string) => console.log(`${chalk.green("✅")} ${message}`),
  warning: (message: string) => console.log(`${chalk.yellow("⚠️")} ${message}`),
  error: (message: string) => console.log(`${chalk.red("❌")} ${message}`),
  debug: (message: string) =>
    DEV_MODE && console.log(`${chalk.gray("🔍")} ${message}`),
  route: (method: string, url: string) =>
    DEV_MODE &&
    console.log(`${chalk.magenta("🔌")} ${chalk.bold(method)} ${url}`),
};

// Request timer middleware
const requestTimer = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (DEV_MODE) {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      const color =
        duration < 50 ? chalk.green : duration < 200 ? chalk.yellow : chalk.red;
      logger.debug(`${req.method} ${req.url} - ${color(duration + "ms")}`);
    });
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
  if (process.platform === 'win32') {
    url = new URL(`file:///${filePath.replace(/\\/g, '/')}`);
  }
  
  return url;
}

// Render a page with its layout
async function renderPage(pagePath: string, params: Record<string, any> = {}) {
  try {
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

    // Render the page component
    try {
      const pageComponent = pageModule.default(pageProps);

      // Wrap with layout if available, otherwise just return the page
      let content;
      if (layoutModule && layoutModule.default) {
        content = layoutModule.default({
          children: pageComponent,
          ...layoutProps,
        });
      } else {
        content = pageComponent;
      }

      // Create hydration script with initial data
      const initialData = {
        ...pageProps,
        ...layoutProps,
        route: params.route || '/',
      };
      
      // Add state hydration script
      const hydrationScript = `
        <script>
          window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};
        </script>
        <script type="module">
          import { hydrateState } from '/elux/core/context.ts';
          
          // Hydrate global state when DOM is ready
          document.addEventListener('DOMContentLoaded', () => {
            if (window.__INITIAL_DATA__) {
              hydrateState(window.__INITIAL_DATA__);
            }
          });
        </script>
        <script type="module" src="/elux/client/client.ts"></script>
      `;

      // Insert hydration script into head or before closing body
      if (typeof content === 'string') {
        if (content.includes('</head>')) {
          content = content.replace('</head>', `${hydrationScript}</head>`);
        } else if (content.includes('</body>')) {
          content = content.replace('</body>', `${hydrationScript}</body>`);
        } else {
          content = `${content}${hydrationScript}`;
        }
      }
      
      return content;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : "";
      logger.error(`Failed to render page component: ${errorMessage}`);

      if (DEV_MODE) {
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
            <h2>Error in Page Component</h2>
            <p>Error rendering page: ${errorMessage}</p>
            <pre style="
              background: #f8f8f8;
              padding: 10px;
              border-radius: 4px;
              overflow-x: auto;
            ">${errorStack}</pre>
          </div>
        `;
      }

      return `<div class="error">Error rendering page</div>`;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    logger.error(`Failed to render page: ${errorMessage}`);

    if (DEV_MODE) {
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
          <h2>Error Loading Page</h2>
          <p>Error: ${errorMessage}</p>
          <pre style="
            background: #f8f8f8;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
          ">${errorStack}</pre>
        </div>
      `;
    }

    return `<div class="error">Error rendering page: ${errorMessage}</div>`;
  }
}

// Handle different routes
async function handleRoute(req: express.Request, res: express.Response) {
  try {
    const route = req.path;
    logger.debug(`Handling route: ${route}`);

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
    const content = await renderPage(pagePath, params);

    // Send the rendered HTML
    res.send(content);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    logger.error(`Route handling error: ${errorMessage}`);
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

    const app = express();
    let vite: any;

    if (DEV_MODE) {
      // Create Vite server in middleware mode
      vite = await createViteServer({
        server: { middlewareMode: true },
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
    }

    // Log all requests for debugging
    app.use(requestTimer);
    app.use((req, res, next) => {
      logger.route(req.method, req.url);
      next();
    });

    // Serve static files with more explicit paths
    app.use(express.static(path.join(process.cwd())));
    app.use("/public", express.static(path.join(process.cwd(), "public")));
    app.use("/styles", express.static(path.join(process.cwd(), "styles")));
    app.use("/elux", express.static(path.join(process.cwd(), "elux")));

    // Custom dev inspector route
    if (DEV_MODE) {
      app.get("/__elux", (req, res) => {
        logger.debug("Dev inspector accessed");
        // We'll implement the full inspector later
        res.sendFile(path.join(process.cwd(), "elux", "dev", "inspector.html"));
      });

      // API endpoint for getting framework status
      app.get("/__elux/api/status", (req, res) => {
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
    }

    // Explicitly handle CSS file requests
    app.get("/styles/globals.css", (req, res) => {
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
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
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
      logger.success(
        `Elux server running at ${chalk.blue(`http://localhost:${PORT}`)}`
      );
      logger.info(
        `Environment: ${chalk.bold(DEV_MODE ? "development" : "production")}`
      );

      if (DEV_MODE) {
        logger.info(
          `Dev inspector: ${chalk.blue(`http://localhost:${PORT}/__elux`)}`
        );
        logger.info(`Press ${chalk.bold("Ctrl+C")} to stop`);
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
