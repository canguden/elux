/**
 * DOM Element Creation Helper
 * This helps ensure components are properly created and tracked
 */

import { VNode, VNodeType } from "./renderer";
import { print, printError } from "../core/utils";
import { setCurrentComponent } from "./renderer";

/**
 * Create a DOM element from a VNode using proper component context
 */
export function createComponentElement(vnode: VNode, container: Element): void {
  if (!vnode || !vnode.tag || typeof vnode.tag !== "function") {
    printError("Invalid component VNode provided to createComponentElement");
    return;
  }

  try {
    const Component = vnode.tag as Function;
    const props = vnode.props || {};

    // Set current component context before rendering
    setCurrentComponent(Component);

    // Call the component function with props
    print(`Creating component element: ${Component.name || "Anonymous"}`);
    const result = Component(props);

    // Reset component context
    setCurrentComponent(null);

    // Clear container
    container.innerHTML = "";

    // Append result to container
    if (typeof result === "string") {
      container.textContent = result;
    } else if (result && typeof result === "object") {
      // This would need to recursively create DOM elements from the VNode
      // For simplicity, we're just setting some content
      container.textContent = `Component ${
        Component.name || "Anonymous"
      } rendered`;
    }
  } catch (error) {
    printError("Error creating component element:", error);
    container.innerHTML = `<div class="error">Error rendering component</div>`;
  }
}
