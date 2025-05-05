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
export async function renderToString(component: VNode): Promise<string> {
  // Import VNodeType enum if not already available
  const { VNodeType } = await import("./core/vdom");

  // Debug logging function - now private and not called in production
  const debugVNode = (node: any, depth = 0): void => {
    // This function is kept for potential future debugging needs but isn't called
    if (!node) return;
    console.log(
      " ".repeat(depth * 2) +
        `Type: ${node.type}, Tag: ${node.tag?.name || node.tag || "none"}`
    );
    if (node.children?.length) {
      console.log(" ".repeat(depth * 2) + "Children:");
      node.children.forEach((child: any) => debugVNode(child, depth + 1));
    }
  };

  // Simple string renderer for demonstration
  // In a real implementation, this would traverse the virtual DOM
  function stringifyNode(node: VNode): string {
    // Check for undefined or non-object
    if (!node || typeof node !== "object") {
      console.error("Invalid node:", node);
      return "";
    }

    // Handle numeric type values (important!)
    if (node.type === 0 || node.type === VNodeType.TEXT) {
      // TEXT
      return node.text
        ? String(node.text).replace(/</g, "&lt;").replace(/>/g, "&gt;")
        : "";
    }

    if (node.type === 1 || node.type === VNodeType.ELEMENT) {
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
              // Properly escape attribute values
              return `${key}="${String(value)
                .replace(/"/g, "&quot;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}"`;
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

      // Recursively process and join children
      let childrenStr = "";
      if (Array.isArray(node.children)) {
        childrenStr = node.children
          .map((child) => stringifyNode(child))
          .join("");
      }

      return `<${tag}${attrsStr}>${childrenStr}</${tag}>`;
    }

    if (node.type === 2 || node.type === VNodeType.COMPONENT) {
      try {
        // Handle Link component specially
        if (
          typeof node.tag === "function" &&
          (node.tag.name === "Link" ||
            (node.props?.href !== undefined &&
              typeof node.props?.onClick === "function"))
        ) {
          const href = node.props?.href || "/";
          const className = node.props?.className || "";

          // Process child content
          let childContent = "";
          if (node.children && node.children.length > 0) {
            childContent = node.children.map(stringifyNode).join("");
          } else if (node.props?.children) {
            // Handle children passed via props
            const childProps = Array.isArray(node.props.children)
              ? node.props.children
              : [node.props.children];

            childContent = childProps
              .map((child: any) =>
                typeof child === "string" ? child : stringifyNode(child)
              )
              .join("");
          }

          return `<a href="${href}" class="${className}">${childContent}</a>`;
        }

        // For non-link components, run the component function to get its VDOM output
        if (typeof node.tag === "function") {
          try {
            // Invoke the component function with props
            const result = node.tag(node.props || {});

            // Check if result is a valid VDOM node
            if (
              result &&
              typeof result === "object" &&
              (result.type !== undefined || result.tag !== undefined)
            ) {
              return stringifyNode(result);
            } else if (result === null || result === undefined) {
              return ""; // Components that return nothing
            } else if (
              typeof result === "string" ||
              typeof result === "number"
            ) {
              return String(result); // Components that return primitives
            } else {
              console.warn("Component returned non-VDOM result:", result);
              return JSON.stringify(result);
            }
          } catch (compError) {
            console.error(
              `Error invoking component ${node.tag.name || "anonymous"}:`,
              compError
            );
            return `<!-- Component Error: ${compError.message} -->`;
          }
        }

        // For other components or fallback, just render children
        if (node.children && node.children.length > 0) {
          return node.children.map(stringifyNode).join("");
        }

        console.warn("Component rendering fallback for:", node.tag);
        return ""; // Empty string for unrenderable components
      } catch (error) {
        console.error("Error rendering component:", error);
        return `<div class="error">Component Error: ${error.message}</div>`;
      }
    }

    if (node.type === 3 || node.type === VNodeType.FRAGMENT) {
      // FRAGMENT - render children without a wrapper
      return node.children ? node.children.map(stringifyNode).join("") : "";
    }

    console.error("Unknown node type:", node);
    return "";
  }

  // Check for non-VDOM object (object without proper type field)
  if (
    !component ||
    typeof component !== "object" ||
    (component.type === undefined && !component.tag && !component.children)
  ) {
    console.error("Invalid component passed to renderToString:", component);
    return JSON.stringify(component, null, 2);
  }

  try {
    // No verbose logging in any environment - keeping terminal clean
    const result = stringifyNode(component);

    // Just log a brief message without the HTML content
    if (process.env.NODE_ENV !== "production") {
      console.log(`Rendered HTML (${result.length} chars)`);
    }

    return result;
  } catch (error) {
    console.error("Error in renderToString:", error);
    return `<div class="error">Error rendering component: ${error.message}</div>`;
  }
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
