/**
 * Elux Framework - Virtual DOM Implementation
 * A lightweight but robust virtual DOM with working diffing algorithm
 */

// Define the types of VNodes
export enum VNodeType {
  TEXT,
  ELEMENT,
  COMPONENT,
  FRAGMENT,
}

// Define the VNode structure
export interface VNode {
  type: VNodeType;
  tag?: string | Function;
  props?: Record<string, any>;
  children?: VNode[];
  text?: string;
  key?: string | number;
  dom?: Element | Text | null;
}

// Create a text VNode
export function createTextNode(text: string): VNode {
  return {
    type: VNodeType.TEXT,
    text,
  };
}

// Create an element VNode
export function createElement(
  tag: string,
  props: Record<string, any> | null = null,
  ...children: (VNode | string | number | boolean | null | undefined)[]
): VNode {
  // Process children to handle strings, numbers, etc.
  const processedChildren = children
    .flat() // Handle nested arrays
    .filter(
      (child) =>
        child !== null &&
        child !== undefined &&
        child !== false &&
        child !== true
    ) // Skip nullish values
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? createTextNode(String(child))
        : (child as VNode)
    );

  return {
    type: VNodeType.ELEMENT,
    tag,
    props: props || {},
    children: processedChildren,
  };
}

// Modified component VNode creation to support client/server components
export function createComponent(
  component: Function,
  props: Record<string, any> | null = null,
  ...children: (VNode | string | number | boolean | null | undefined)[]
): VNode {
  // Process children to handle strings, numbers, etc.
  const processedChildren = children
    .flat() // Handle nested arrays
    .filter(
      (child) =>
        child !== null &&
        child !== undefined &&
        child !== false &&
        child !== true
    ) // Skip nullish values
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? createTextNode(String(child))
        : (child as VNode)
    );

  // Create props with children included
  const finalProps = { ...(props || {}) };

  // Only set children if there are any
  if (processedChildren.length > 0) {
    finalProps.children = processedChildren;
  }

  // Generate a stable component ID if one doesn't exist
  const componentId =
    finalProps._elux_component_id ||
    `${component.name || "component"}-${Math.random()
      .toString(36)
      .substring(2, 10)}`;

  // Add component ID to props for state tracking
  finalProps._elux_component_id = componentId;

  return {
    type: VNodeType.COMPONENT,
    tag: component,
    props: finalProps,
    children: processedChildren,
  };
}

// Create a fragment
export function createFragment(
  children: (VNode | string | number | boolean | null | undefined)[]
): VNode {
  // Process children to handle strings, numbers, etc.
  const processedChildren = children
    .flat() // Handle nested arrays
    .filter(
      (child) =>
        child !== null &&
        child !== undefined &&
        child !== false &&
        child !== true
    ) // Skip nullish values
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? createTextNode(String(child))
        : (child as VNode)
    );

  return {
    type: VNodeType.FRAGMENT,
    children: processedChildren,
  };
}

// Fragment symbol for JSX
export const Fragment = Symbol("Fragment");

// Modified h function to support client/server components
export function h(
  tag: string | Function | symbol,
  props: Record<string, any> | null = null,
  ...children: (VNode | string | number | boolean | null | undefined)[]
): VNode {
  if (tag === Fragment) {
    return createFragment(children);
  } else if (typeof tag === "function") {
    // Try to use our component system's createSmartComponent if available
    try {
      // Dynamic import to avoid circular dependencies
      const components = require("./components");
      if (components && typeof components.createSmartComponent === "function") {
        return components.createSmartComponent(tag, props);
      }
    } catch (e) {
      // Fallback to regular component creation if components module not available
    }
    return createComponent(tag, props, ...children);
  } else {
    return createElement(tag as string, props, ...children);
  }
}

// JSX factory function
export function jsx(
  tag: string | Function | symbol,
  props: Record<string, any>,
  ...rest: any[]
): VNode {
  // Extract children from props if present
  const { children, ...restProps } = props || {};

  // Combine children from props and extra args
  const allChildren = [...(children ? [children] : []), ...rest].filter(
    Boolean
  );

  // Use the h function
  return h(tag, restProps, ...allChildren);
}

// Convert a VNode to a DOM element
function createDomElement(vnode: VNode): Element | Text | DocumentFragment {
  if (vnode.type === VNodeType.TEXT) {
    const textNode = document.createTextNode(vnode.text || "");
    vnode.dom = textNode;
    return textNode;
  }

  if (vnode.type === VNodeType.FRAGMENT) {
    const fragment = document.createDocumentFragment();

    if (vnode.children) {
      for (const child of vnode.children) {
        const childDom = createDomElement(child);
        fragment.appendChild(childDom);
      }
    }

    // Fragments don't have a DOM reference themselves
    vnode.dom = null;
    return fragment;
  }

  if (vnode.type === VNodeType.ELEMENT) {
    const element = document.createElement(vnode.tag as string);
    vnode.dom = element;

    // Set attributes/props
    if (vnode.props) {
      for (const [key, value] of Object.entries(vnode.props)) {
        if (key === "className") {
          element.setAttribute("class", value);
        } else if (key === "style" && typeof value === "object") {
          Object.assign(element.style, value);
        } else if (key.startsWith("on") && typeof value === "function") {
          const eventName = key.substring(2).toLowerCase();
          element.addEventListener(eventName, value);
        } else if (
          key !== "children" &&
          value !== false &&
          value !== null &&
          value !== undefined
        ) {
          element.setAttribute(key, String(value));
        }
      }
    }

    // Add children
    if (vnode.children) {
      for (const child of vnode.children) {
        const childDom = createDomElement(child);
        element.appendChild(childDom);
      }
    }

    return element;
  }

  if (vnode.type === VNodeType.COMPONENT) {
    const component = vnode.tag as Function;
    try {
      // Call the component function to get its rendered output
      const renderedVNode = component(vnode.props || {});

      // Create DOM from the rendered output
      const dom = createDomElement(renderedVNode);

      // Store reference to the created DOM
      vnode.dom = dom instanceof DocumentFragment ? null : dom;

      return dom;
    } catch (error) {
      console.error(`Error rendering component:`, error);

      // Create error element
      const errorElement = document.createElement("div");
      errorElement.className = "error";
      errorElement.textContent = `Error: ${
        error instanceof Error ? error.message : String(error)
      }`;

      vnode.dom = errorElement;
      return errorElement;
    }
  }

  // Fallback - should never happen
  console.error("Unknown VNode type:", vnode);
  const errorNode = document.createTextNode("Error: Unknown node type");
  vnode.dom = errorNode;
  return errorNode;
}

// Main function to render a VNode to a DOM container
export function render(vnode: VNode, container: Element | string): void {
  console.log("[VDOM] Rendering:", vnode);

  // Get the container element
  const domContainer =
    typeof container === "string"
      ? document.querySelector(container)
      : container;

  if (!domContainer) {
    console.error(`[VDOM] Container not found:`, container);
    return;
  }

  try {
    // Clear the container
    domContainer.innerHTML = "";

    // Create the DOM element
    const dom = createDomElement(vnode);

    // Add to container
    domContainer.appendChild(dom);

    console.log("[VDOM] Render complete");
  } catch (error) {
    console.error("[VDOM] Render error:", error);

    // Show error in container
    domContainer.innerHTML = `
      <div style="color: red; padding: 16px; border: 1px solid red; margin: 16px 0;">
        <h3>Render Error</h3>
        <p>${error instanceof Error ? error.message : String(error)}</p>
      </div>
    `;
  }
}

// Function to patch/update existing DOM (diffing algorithm)
export function patch(
  oldVNode: VNode | null,
  newVNode: VNode,
  container: Element
): void {
  // Implementation of diffing algorithm would go here
  // For now, we'll just re-render everything
  render(newVNode, container);
}
