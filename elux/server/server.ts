/**
 * Elux Server-Side Component Handler
 * Handles server-side component rendering and serialization
 */

import { print, printError } from "../core/utils";

// Track server-rendered components for hydration
const serverRenderedComponents = new Map<string, any>();

/**
 * Server-side component rendering function
 * Renders a component on the server and creates appropriate placeholders for client hydration
 */
export function renderServerComponent(
  component: Function,
  props: Record<string, any> = {},
  isClientComponent = false
): string {
  try {
    // Try to get component metadata
    let componentType = "hybrid";
    let componentId =
      props._elux_component_id ||
      `${component.name || "component"}-${Date.now()}`;

    try {
      // Dynamic import to avoid circular dependencies
      const components = require("../core/components");
      if (components) {
        const meta = components.getComponentMeta(component);
        componentType = meta.type || "hybrid";
        componentId = meta.instanceId || componentId;

        // Override isClientComponent if the component is explicitly marked
        if (meta.clientOnly) {
          isClientComponent = true;
        }
      }
    } catch (error) {
      // Fallback if components module not available
      print(
        `Warning: Could not access component metadata for ${
          component.name || "Anonymous"
        }`
      );
    }

    // For client-only components, return a placeholder
    if (isClientComponent) {
      // Store component properties for hydration
      serverRenderedComponents.set(componentId, {
        props,
        component: component.name || "Anonymous",
      });

      // Return a placeholder div for the client to hydrate
      return `<div data-elux-component="client" data-component-id="${componentId}" data-component-name="${
        component.name || "Anonymous"
      }">
        <div class="elux-component-placeholder">Loading ${
          component.name || "component"
        }...</div>
      </div>`;
    }

    // For server components, execute the component function
    let result;
    try {
      result = component(props);
    } catch (error) {
      printError(
        `Error rendering component ${component.name || "Anonymous"}:`,
        error
      );
      return `<div class="elux-render-error">Error rendering component</div>`;
    }

    // Handle different result types
    if (typeof result === "string") {
      return result;
    } else if (typeof result === "object" && result !== null) {
      // If result is a VNode, we'd need to recurse and render it
      // For simplicity in this example, we'll just return a placeholder
      return `<div data-elux-component="server" data-component-id="${componentId}">
        Component rendered on server
      </div>`;
    }

    // Default fallback
    return `<div data-elux-component="server" data-component-id="${componentId}">
      ${component.name || "Anonymous"} component
    </div>`;
  } catch (error) {
    printError("Error in server component rendering:", error);
    return `<div class="elux-render-error">Component rendering failed</div>`;
  }
}

/**
 * Generate hydration data to be sent to the client
 */
export function getHydrationData(): string {
  const hydrationData: Record<string, any> = {};

  // Convert component map to serializable object
  serverRenderedComponents.forEach((value, key) => {
    hydrationData[key] = {
      props: value.props,
      component: value.component,
    };
  });

  // Serialize the data for client hydration
  return `<script id="__ELUX_HYDRATION_DATA__" type="application/json">${JSON.stringify(
    hydrationData
  )}</script>`;
}

/**
 * Server-side rendering function that includes component hydration data
 */
export function renderWithHydration(html: string): string {
  // Add hydration data script before closing body tag
  const hydrationScript = getHydrationData();
  return html.replace("</body>", `${hydrationScript}</body>`);
}
