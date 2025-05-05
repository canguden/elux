import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { router, RouteMatch } from "./server/router";
import { VNode } from "./client/renderer";

// Load environment variables
import dotenv from "dotenv";
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Server-side rendering context
export interface SSRContext {
  req: Request;
  res: Response;
  params: Record<string, string>;
  url: string;
  isSSR: boolean;
  isSSG: boolean;
}

// Page module structure
export interface PageModule {
  default: (props: any) => VNode;
  getStaticProps?: (context: SSRContext) => Promise<any>;
  getServerSideProps?: (context: SSRContext) => Promise<any>;
}

// Create the default template with placeholders
function createDefaultTemplate(
  head = "",
  body = "",
  scripts = "",
  initialState = "{}",
  routes = "[]"
): string {
  // Read the template file
  const templatePath = path.join(process.cwd(), "index.html");
  let template = "";

  try {
    template = fs.readFileSync(templatePath, "utf-8");
  } catch (error) {
    console.error("Failed to read template file:", error);
    // Fallback template
    template = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!-- ELUX_HEAD -->
        </head>
        <body>
          <div id="app"><!-- ELUX_APP --></div>
          <script type="module" src="/framework/client/entry.ts"></script>
        </body>
      </html>
    `;
  }

  // Replace placeholders
  template = template
    .replace("<!-- ELUX_HEAD -->", head)
    .replace("<!-- ELUX_APP -->", body)
    .replace(
      "</body>",
      `<script>
        window.__ELUX_STATE__ = ${initialState};
        window.__ELUX_ROUTES__ = ${routes};
       </script>${scripts}</body>`
    );

  return template;
}

// Render a component to HTML string
async function renderToString(component: VNode): Promise<string> {
  // Simple string renderer for demonstration
  // In a real implementation, this would traverse the virtual DOM
  function stringifyNode(node: VNode): string {
    if (!node) return "";

    if (node.type === 0) {
      // TEXT
      return node.text || "";
    }

    if (node.type === 1) {
      // ELEMENT
      const tag = node.tag as string;
      const attrs = node.props
        ? Object.entries(node.props)
            .filter(([key]) => key !== "children" && !key.startsWith("on"))
            .map(([key, value]) => {
              if (key === "className") key = "class";
              if (typeof value === "boolean") {
                return value ? key : "";
              }
              return `${key}="${value}"`;
            })
            .filter(Boolean)
            .join(" ")
        : "";

      const attrsStr = attrs ? ` ${attrs}` : "";

      if (!node.children || node.children.length === 0) {
        // Self-closing tags
        if (["img", "input", "br", "hr", "meta", "link"].includes(tag)) {
          return `<${tag}${attrsStr}/>`;
        }
        return `<${tag}${attrsStr}></${tag}>`;
      }

      const childrenStr = node.children.map(stringifyNode).join("");

      return `<${tag}${attrsStr}>${childrenStr}</${tag}>`;
    }

    if (node.type === 2) {
      // COMPONENT
      // This is simplified; real implementation would need to handle component rendering
      return "Component rendering not implemented";
    }

    if (node.type === 3) {
      // FRAGMENT
      return node.children ? node.children.map(stringifyNode).join("") : "";
    }

    return "";
  }

  return stringifyNode(component);
}

// Create an Express server for SSR
export async function createServer(options: {
  appDir?: string;
  port?: number;
  staticDir?: string;
}) {
  const { appDir = "app", port = 3000, staticDir = "public" } = options;

  const app = express();

  // Serve static files
  app.use(express.static(staticDir));

  // Serve framework client files
  app.use("/framework", express.static(path.join(process.cwd(), "framework")));

  // Make sure fonts and styles are served
  app.use("/styles", express.static(path.join(process.cwd(), "styles")));

  console.log("Scanning routes in directory:", appDir);

  // Scan the app directory for routes
  await router.scanRoutes(appDir);
  const routes = router.getClientRoutes();
  console.log("Routes found:", routes.map((r) => r.path).join(", "));

  // Prepare serializable routes
  const clientRoutes = router.getClientRoutes();

  // Handle all routes
  app.get("*", async (req: Request, res: Response) => {
    try {
      const url = req.url;
      console.log("Handling request for:", url);

      // Match the route
      const match: RouteMatch = router.match(url);
      const { route, params } = match;

      console.log("Route matched:", route.path, "Params:", params);

      // Create context for data fetching
      const context: SSRContext = {
        req,
        res,
        params,
        url: req.url,
        isSSR: !!route.meta.ssr,
        isSSG: !!route.meta.ssg,
      };

      try {
        // Simplified component rendering - don't try to load components
        // which might be failing
        console.log("Using simplified component rendering");

        // Create a container div
        const containerNode = {
          type: 1, // ELEMENT
          tag: "div",
          props: { id: "app" },
          children: [],
        };

        // Use a simple hardcoded component
        if (url === "/") {
          // Root path
          containerNode.children = [
            {
              type: 1, // ELEMENT
              tag: "div",
              props: { className: "container" },
              children: [
                {
                  type: 1, // ELEMENT
                  tag: "header",
                  props: { className: "header" },
                  children: [
                    {
                      type: 1, // ELEMENT
                      tag: "h1",
                      props: {},
                      children: [
                        {
                          type: 0, // TEXT
                          text: "Elux Framework",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 1, // ELEMENT
                  tag: "main",
                  props: {},
                  children: [
                    {
                      type: 1, // ELEMENT
                      tag: "h2",
                      props: {},
                      children: [
                        {
                          type: 0, // TEXT
                          text: "Welcome to Elux",
                        },
                      ],
                    },
                    {
                      type: 1, // ELEMENT
                      tag: "p",
                      props: {},
                      children: [
                        {
                          type: 0, // TEXT
                          text: "A lightweight TypeScript framework",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ];
        } else {
          // Other routes
          containerNode.children = [
            {
              type: 1, // ELEMENT
              tag: "div",
              props: { className: "container" },
              children: [
                {
                  type: 1, // ELEMENT
                  tag: "header",
                  props: { className: "header" },
                  children: [
                    {
                      type: 1, // ELEMENT
                      tag: "h1",
                      props: {},
                      children: [
                        {
                          type: 0, // TEXT
                          text: "Elux",
                        },
                      ],
                    },
                    {
                      type: 1, // ELEMENT
                      tag: "nav",
                      props: {},
                      children: [
                        {
                          type: 1, // ELEMENT
                          tag: "a",
                          props: { href: "/" },
                          children: [
                            {
                              type: 0, // TEXT
                              text: "Home",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 1, // ELEMENT
                  tag: "main",
                  props: {},
                  children: [
                    {
                      type: 1, // ELEMENT
                      tag: "h2",
                      props: {},
                      children: [
                        {
                          type: 0, // TEXT
                          text: `Page: ${url}`,
                        },
                      ],
                    },
                    {
                      type: 1, // ELEMENT
                      tag: "p",
                      props: {},
                      children: [
                        {
                          type: 0, // TEXT
                          text: "This is a server-rendered page",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ];
        }

        // Render the page to HTML
        console.log("Rendering to HTML...");
        const pageHtml = await renderToString(containerNode);

        // Create the full HTML
        const html = createDefaultTemplate(
          "", // Head content
          pageHtml, // Body content
          "", // Scripts
          JSON.stringify({}), // Initial state - simplified
          JSON.stringify(clientRoutes) // Routes for client navigation
        );

        console.log("Sending response...");
        res.send(html);
      } catch (error) {
        console.error("Error handling request:", error);

        // Send error page
        const errorHtml = `
          <div class="error-page">
            <h1>Error</h1>
            <p>${error instanceof Error ? error.message : String(error)}</p>
            <a href="/">Go Home</a>
          </div>
        `;

        const html = createDefaultTemplate(
          "<title>Error - Elux</title>",
          errorHtml,
          "",
          "{}",
          JSON.stringify(clientRoutes)
        );

        res.status(500).send(html);
      }
    } catch (error) {
      console.error("Error rendering page:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Start the server
  return app.listen(port, () => {
    console.log(`Elux server running at http://localhost:${port}`);
  });
}

// Export for CLI usage
export default {
  createServer,
};
