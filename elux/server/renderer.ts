/**
 * Elux Server-Side Renderer
 * Handles converting VDOM to HTML strings for SSR
 */

import { VNodeType } from "../core/vdom";

// Define the VNode structure (should match client definition)
export interface VNode {
  type: VNodeType;
  tag?: string | Function;
  props?: Record<string, any>;
  children?: VNode[];
  text?: string;
  key?: string | number;
  dom?: any;
}

/**
 * Render a component tree to an HTML string for server-side rendering
 */
export async function renderToString(component: VNode): Promise<string> {
  if (!component || typeof component !== "object") {
    console.error("Invalid component passed to renderToString:", component);
    return "";
  }

  function stringifyNode(node: VNode): string {
    // Check for undefined or non-object
    if (!node || typeof node !== "object") {
      console.error("Invalid node:", node);
      return "";
    }

    // Handle TEXT nodes
    if (node.type === VNodeType.TEXT) {
      return node.text
        ? String(node.text).replace(/</g, "&lt;").replace(/>/g, "&gt;")
        : "";
    }

    // Handle ELEMENT nodes
    if (node.type === VNodeType.ELEMENT) {
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

    // Handle COMPONENT nodes
    if (node.type === VNodeType.COMPONENT) {
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
              typeof result.type !== "undefined"
            ) {
              return stringifyNode(result);
            } else {
              console.error(
                "Component did not return a valid VDOM node:",
                result
              );
              return "";
            }
          } catch (e) {
            console.error(
              `Error rendering component ${node.tag.name || "unknown"}:`,
              e
            );
            return `<div class="error">Error rendering component</div>`;
          }
        }
      } catch (error) {
        console.error("Error in component rendering:", error);
        return `<div class="error">Component error</div>`;
      }
    }

    // Handle FRAGMENT nodes
    if (node.type === VNodeType.FRAGMENT) {
      if (!node.children || node.children.length === 0) {
        return "";
      }

      return node.children.map(stringifyNode).join("");
    }

    console.error("Unknown node type:", node);
    return "";
  }

  try {
    return stringifyNode(component);
  } catch (error) {
    console.error("Error in renderToString:", error);
    return `<div class="ssr-error">Error rendering component</div>`;
  }
}
