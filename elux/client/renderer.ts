// Virtual DOM node types
import { print, printError } from "../core/utils";
import { getComponentMeta } from "../core/components";

export enum VNodeType {
  TEXT,
  ELEMENT,
  COMPONENT,
  FRAGMENT,
}

// Virtual DOM node interface
export interface VNode {
  type: VNodeType;
  tag?: string | Function;
  props?: Record<string, any>;
  children?: VNode[];
  text?: string;
  key?: string | number;
  ref?: any;
  _el?: Element | Text; // DOM reference
  _parent?: Element; // Parent element reference
  _index?: number; // Index within parent for re-rendering
}

// Track current component being rendered
let currentComponent: Function | null = null;

// Component to VNodes map for re-rendering
const componentVNodeMap = new WeakMap<
  Function,
  {
    vnode: VNode;
    container: Element;
    index: number;
  }
>();

// Add a new section for client component handling

/**
 * Special handling for client components
 */
let currentlyRenderingComponent: Function | null = null;

/**
 * Get the currently rendering component for context tracking
 */
export function getCurrentComponent(): Function | null {
  return currentlyRenderingComponent;
}

/**
 * Set the currently rendering component for context tracking
 */
export function setCurrentComponent(component: Function | null): void {
  currentlyRenderingComponent = component;
}

/**
 * Load and render a client component with stable identifier
 */
export function renderClientComponent(
  component: Function,
  props: Record<string, any>,
  container: Element
): void {
  try {
    // Import our components system
    import("../core/components")
      .then((components) => {
        const { isClient, getComponentMeta, ComponentType } = components;

        // Only render client components on the client
        if (!isClient) {
          return;
        }

        const meta = getComponentMeta(component);

        // Check if this is a client component
        if (meta.type === ComponentType.CLIENT) {
          // Set the component as currently rendering for context
          setCurrentComponent(component);

          // Generate stable ID from component name and props
          const stableId =
            props._elux_component_id ||
            `${component.name || "component"}-${Math.random()
              .toString(36)
              .substring(2, 10)}`;

          // Add a data attribute for hydration
          if (container instanceof HTMLElement) {
            container.setAttribute("data-elux-component", "client");
            container.setAttribute("data-component-id", stableId);
            container.setAttribute(
              "data-component-name",
              component.name || "Anonymous"
            );
          }

          // Execute the component function
          try {
            const result = component(props);

            // Render the result into the container
            container.innerHTML = "";

            if (typeof result === "object" && result !== null) {
              // Handle a VNode result
              const domNode = createDOMElement(result);
              if (domNode) {
                container.appendChild(domNode);
              }
            } else if (typeof result === "string") {
              // Handle string result
              container.textContent = result;
            }
          } catch (error) {
            console.error(
              `Error rendering client component ${component.name}:`,
              error
            );
            container.innerHTML = `<div class="error">Error rendering component</div>`;
          }

          // Reset current component
          setCurrentComponent(null);
        }
      })
      .catch((error) => {
        console.error("Error loading component system:", error);
      });
  } catch (error) {
    console.error("Error in renderClientComponent:", error);
  }
}

/**
 * Re-render a specific component for state changes
 */
export function reRenderComponent(component: Function): void {
  try {
    // Find all instances of this component in the DOM
    if (typeof document === "undefined") {
      return;
    }

    print(
      `[Renderer] Attempting to re-render component: ${
        component.name || "Anonymous"
      }`
    );

    const meta = getComponentMeta(component);
    if (!meta) {
      print(`[Renderer] No metadata for component, can't re-render`);
      return;
    }

    // First try to find by instance ID
    let instances: NodeListOf<Element>;
    if (meta.instanceId) {
      instances = document.querySelectorAll(
        `[data-component-id="${meta.instanceId}"]`
      );
      if (instances.length === 0) {
        // Fallback to finding by component name
        instances = document.querySelectorAll(
          `[data-component-name="${component.name || "Anonymous"}"]`
        );
      }
    } else {
      // No instance ID, try to find by name
      instances = document.querySelectorAll(
        `[data-component-name="${component.name || "Anonymous"}"]`
      );
    }

    print(
      `[Renderer] Found ${instances.length} instances of component to re-render`
    );

    // Re-render each instance
    instances.forEach((container) => {
      try {
        // Try to get the component props from data attributes
        const props: Record<string, any> = {};

        // Extract props from data attributes if available
        Array.from(container.attributes).forEach((attr) => {
          if (attr.name.startsWith("data-prop-")) {
            const propName = attr.name.replace("data-prop-", "");
            props[propName] = attr.value;
          }
        });

        // Render the component with available props
        const vnode = h(component, props);

        // Create a new DOM element from the vnode
        const newElement = createDOMElement(vnode);

        // Replace the existing element with the new one
        if (container.parentNode) {
          container.parentNode.replaceChild(newElement, container);
          print(`[Renderer] Successfully re-rendered component`);
        }
      } catch (error) {
        printError(`[Renderer] Error re-rendering component:`, error);
      }
    });

    // If we couldn't find the component by data attributes, use generic approach
    if (instances.length === 0) {
      print(
        `[Renderer] No instances found by ID/name, using generic component update`
      );

      // Generic approach: Find any component with state changes
      const componentContainers = document.querySelectorAll(
        "[data-elux-component]"
      );
      if (componentContainers.length > 0) {
        print(
          `[Renderer] Found ${componentContainers.length} generic components to check`
        );

        // For each component container, dispatch a state change event
        componentContainers.forEach((container) => {
          if (
            container.getAttribute("data-component-name") === component.name ||
            container.getAttribute("data-elux-component") ===
              component.name.toLowerCase()
          ) {
            // Dispatch an event that the component can listen to
            const event = new CustomEvent("elux-state-changed", {
              bubbles: true,
              detail: {
                componentName: component.name,
                timestamp: Date.now(),
              },
            });
            container.dispatchEvent(event);
          }
        });
      }
    }
  } catch (error) {
    printError("[Renderer] General error in reRenderComponent:", error);
  }
}

/**
 * Helper function to update components generically through event system
 * This avoids having to write component-specific code in the renderer
 */
export function notifyComponentUpdate(componentName: string, data?: any): void {
  if (typeof document === "undefined") return;

  try {
    const event = new CustomEvent("elux-component-update", {
      bubbles: true,
      detail: { componentName, data, timestamp: Date.now() },
    });

    window.dispatchEvent(event);

    print(`[Renderer] Notified update for component: ${componentName}`);
  } catch (e) {
    // Ignore errors in this helper function
  }
}

// Create a text VNode
export function createText(text: string): VNode {
  return {
    type: VNodeType.TEXT,
    text,
  };
}

// Create an element VNode
export function createElement(
  tag: string,
  props: Record<string, any> | null = null,
  ...children: (VNode | string)[]
): VNode {
  const processedChildren = children.map((child) =>
    typeof child === "string" ? createText(child) : child
  );

  return {
    type: VNodeType.ELEMENT,
    tag,
    props: props || {},
    children: processedChildren,
  };
}

// Create a component VNode
export function createComponent(
  component: Function,
  props: Record<string, any> | null = null,
  ...children: (VNode | string)[]
): VNode {
  const processedChildren = children.map((child) =>
    typeof child === "string" ? createText(child) : child
  );

  // Create props object with children
  const finalProps = props ? { ...props } : {};

  // Only set children prop if there are children
  if (processedChildren.length > 0) {
    finalProps.children = processedChildren;
  }

  return {
    type: VNodeType.COMPONENT,
    tag: component,
    props: finalProps,
    children: processedChildren,
  };
}

// Create a fragment VNode
export function createFragment(children: (VNode | string)[]): VNode {
  const processedChildren = children.map((child) =>
    typeof child === "string" ? createText(child) : child
  );

  return {
    type: VNodeType.FRAGMENT,
    children: processedChildren,
  };
}

// Export a Fragment symbol for JSX fragments
export const Fragment = Symbol("Fragment");

// Create a DOM element from a VNode
function createDOMElement(vnode: VNode): Element | Text {
  // Add check for undefined or null vnode
  if (!vnode) {
    printError("Attempted to render undefined or null vnode");
    const errorEl = document.createElement("div");
    errorEl.className = "elux-error";
    errorEl.style.padding = "10px";
    errorEl.style.margin = "10px 0";
    errorEl.style.border = "2px solid #e53e3e";
    errorEl.style.borderRadius = "4px";
    errorEl.style.background = "#fff5f5";
    errorEl.style.color = "#e53e3e";
    errorEl.textContent = "Error: Undefined component";
    return errorEl;
  }

  if (vnode.type === VNodeType.TEXT) {
    return document.createTextNode(vnode.text || "");
  }

  if (vnode.type === VNodeType.ELEMENT) {
    const el = document.createElement(vnode.tag as string);

    // Set attributes
    if (vnode.props) {
      for (const [key, value] of Object.entries(vnode.props)) {
        if (key === "style" && typeof value === "object") {
          Object.assign(el.style, value);
        } else if (key === "className") {
          // Handle className attribute specially for JSX compatibility
          el.setAttribute("class", String(value));
        } else if (key.startsWith("on") && typeof value === "function") {
          const eventName = key.substring(2).toLowerCase();
          el.addEventListener(eventName, value);
        } else if (
          key !== "children" &&
          key !== "_elux_component_id" &&
          key !== "_elux_component_type"
        ) {
          // Skip internal Elux props
          if (value !== null && value !== undefined && value !== false) {
            el.setAttribute(key, String(value));
          }
        }
      }

      // Add component data attributes if this is a component container
      if (vnode.props._elux_component_id) {
        el.setAttribute("data-component-id", vnode.props._elux_component_id);
      }
      if (vnode.props._elux_component_type) {
        el.setAttribute(
          "data-component-type",
          vnode.props._elux_component_type
        );
      }
    }

    // Add children
    if (vnode.children) {
      for (const child of vnode.children) {
        if (child) {
          // Skip null/undefined children
          const childEl = createDOMElement(child);
          el.appendChild(childEl);
        }
      }
    }

    vnode._el = el;
    return el;
  }

  if (vnode.type === VNodeType.FRAGMENT) {
    const fragment = document.createDocumentFragment();

    if (vnode.children) {
      for (const child of vnode.children) {
        if (child) {
          // Skip null/undefined children
          const childEl = createDOMElement(child);
          fragment.appendChild(childEl);
        }
      }
    }

    // Fragments don't have a direct DOM reference
    return fragment as unknown as Element;
  }

  if (vnode.type === VNodeType.COMPONENT) {
    try {
      // Get the component function and metadata
      const componentFn = vnode.tag as Function;

      // Set current component being rendered for signal tracking
      currentlyRenderingComponent = componentFn;

      // Get component metadata to handle client/server components
      let componentOutput;

      try {
        // Try to get metadata for client/server component handling
        const meta = getComponentMeta(componentFn);
        print(
          `Rendering component: ${componentFn.name || "Anonymous"} (type: ${
            meta.type
          })`
        );

        // For client-only components, check if we're on client
        if (meta.clientOnly && typeof window === "undefined") {
          print(
            `Client-only component ${componentFn.name} rendered on server - using placeholder`
          );
          const placeholderEl = document.createElement("div");
          placeholderEl.setAttribute("data-elux-component", "client");
          placeholderEl.setAttribute(
            "data-component-name",
            componentFn.name || "Anonymous"
          );
          placeholderEl.setAttribute(
            "data-component-id",
            meta.instanceId || "unknown"
          );
          placeholderEl.textContent = `Client component placeholder: ${
            componentFn.name || "Anonymous"
          }`;
          return placeholderEl;
        }

        // Now call the component function with its props to get rendered output
        componentOutput = componentFn(vnode.props || {});

        // Check if componentOutput is null or undefined and provide a fallback
        if (componentOutput === null || componentOutput === undefined) {
          printError(
            `Component ${
              componentFn.name || "Anonymous"
            } returned null or undefined - providing fallback element`
          );

          // Create a fallback element instead of failing
          componentOutput = createElement(
            "div",
            {
              className: "elux-component-fallback",
              style:
                "padding: 10px; color: #666; background: #f9f9f9; border: 1px dashed #ccc;",
            },
            `Component ${
              componentFn.name || "Anonymous"
            } rendered empty content`
          );
        }
      } catch (metaError) {
        // If metadata system fails, fall back to direct component rendering
        print(
          `Component metadata system error: ${metaError}. Falling back to direct rendering.`
        );

        try {
          componentOutput = componentFn(vnode.props || {});

          // Check if componentOutput is null after fallback
          if (componentOutput === null || componentOutput === undefined) {
            printError(
              `Component ${
                componentFn.name || "Anonymous"
              } returned null after metadata fallback - using fallback element`
            );

            // Create a fallback element instead of failing
            componentOutput = createElement(
              "div",
              {
                className: "elux-component-fallback",
                style:
                  "padding: 10px; color: #666; background: #f9f9f9; border: 1px dashed #ccc;",
              },
              `Component ${
                componentFn.name || "Anonymous"
              } rendered empty content`
            );
          }
        } catch (renderError) {
          printError(
            `Error rendering component ${componentFn.name || "Anonymous"}:`,
            renderError
          );

          // Return an error component if rendering fails
          componentOutput = createElement(
            "div",
            {
              className: "elux-error",
              style: "color: red; padding: 10px; border: 1px solid red;",
            },
            `Error in component ${
              componentFn.name || "Anonymous"
            }: ${renderError}`
          );
        }
      }

      // Reset current component
      currentlyRenderingComponent = null;

      // Create DOM element from the component output
      if (typeof componentOutput === "string") {
        const textNode = document.createTextNode(componentOutput);
        return textNode;
      } else if (componentOutput) {
        return createDOMElement(componentOutput);
      } else {
        // This shouldn't happen because we provide fallbacks above, but just in case
        const placeholderEl = document.createElement("div");
        placeholderEl.className = "elux-component-empty";
        placeholderEl.textContent = `Component ${
          componentFn.name || "Anonymous"
        } rendered nothing`;
        return placeholderEl;
      }
    } catch (error) {
      // Reset current component in case of error
      currentlyRenderingComponent = null;

      // Create an error element to display component errors
      const errorEl = document.createElement("div");
      errorEl.className = "elux-error";
      errorEl.style.padding = "10px";
      errorEl.style.margin = "10px 0";
      errorEl.style.border = "2px solid #e53e3e";
      errorEl.style.borderRadius = "4px";
      errorEl.style.background = "#fff5f5";
      errorEl.style.color = "#e53e3e";

      const componentName =
        (vnode.tag as Function).name ||
        (vnode.tag as any).displayName ||
        "Component";

      const errorTitle = document.createElement("h3");
      errorTitle.textContent = `Error in <${componentName}>`;
      errorTitle.style.margin = "0 0 8px 0";

      const errorMessage = document.createElement("pre");
      errorMessage.style.margin = "0";
      errorMessage.style.fontFamily = "monospace";
      errorMessage.style.fontSize = "12px";
      errorMessage.style.whiteSpace = "pre-wrap";
      errorMessage.textContent =
        error instanceof Error
          ? `${error.message}\n${error.stack}`
          : String(error);

      errorEl.appendChild(errorTitle);
      errorEl.appendChild(errorMessage);

      printError(`Error rendering component <${componentName}>:`, error);

      return errorEl;
    }
  }

  // Handle unknown type fallback
  const errorEl = document.createElement("div");
  errorEl.className = "elux-error";
  errorEl.textContent = `Unknown VNode type: ${vnode.type}`;
  return errorEl;
}

// Diff and patch the DOM
function patchDOM(
  oldVNode: VNode | null,
  newVNode: VNode,
  parentElement: Element,
  index = 0
): void {
  // If no old node, create and append new node
  if (!oldVNode) {
    const newElement = createDOMElement(newVNode);
    parentElement.appendChild(newElement);

    // Store parent reference for future updates
    newVNode._parent = parentElement;
    newVNode._index = index;
    return;
  }

  // If no new node, remove old node
  if (!newVNode) {
    if (oldVNode._el) {
      parentElement.removeChild(oldVNode._el);
    }
    return;
  }

  // If node types don't match, replace the old node
  if (oldVNode.type !== newVNode.type || oldVNode.tag !== newVNode.tag) {
    const oldElement = oldVNode._el;
    const newElement = createDOMElement(newVNode);
    if (oldElement) {
      parentElement.replaceChild(newElement, oldElement);
    }

    // Store parent reference for future updates
    newVNode._parent = parentElement;
    newVNode._index = index;
    return;
  }

  // Text nodes: update content if changed
  if (newVNode.type === VNodeType.TEXT) {
    if (oldVNode.text !== newVNode.text && oldVNode._el) {
      (oldVNode._el as Text).nodeValue = newVNode.text || "";
    }
    newVNode._el = oldVNode._el;
    newVNode._parent = parentElement;
    newVNode._index = index;
    return;
  }

  // Element nodes: update properties and children
  if (newVNode.type === VNodeType.ELEMENT) {
    // Preserve the DOM reference
    newVNode._el = oldVNode._el;
    newVNode._parent = parentElement;
    newVNode._index = index;

    // Update attributes
    const el = newVNode._el as Element;
    const oldProps = oldVNode.props || {};
    const newProps = newVNode.props || {};

    // Remove obsolete attributes
    for (const key in oldProps) {
      if (!(key in newProps) && key !== "children") {
        if (key.startsWith("on")) {
          const eventName = key.substring(2).toLowerCase();
          el.removeEventListener(eventName, oldProps[key]);
        } else if (key === "className") {
          el.removeAttribute("class");
        } else {
          el.removeAttribute(key);
        }
      }
    }

    // Add/update new attributes
    for (const key in newProps) {
      if (key !== "children" && oldProps[key] !== newProps[key]) {
        if (key === "style" && typeof newProps[key] === "object") {
          // Reset styles
          el.removeAttribute("style");
          Object.assign((el as HTMLElement).style, newProps[key]);
        } else if (
          key.startsWith("on") &&
          typeof newProps[key] === "function"
        ) {
          const eventName = key.substring(2).toLowerCase();
          if (oldProps[key]) {
            el.removeEventListener(eventName, oldProps[key]);
          }
          el.addEventListener(eventName, newProps[key]);
        } else if (key === "className") {
          // Handle className separately for JSX compatibility
          el.setAttribute("class", String(newProps[key]));
        } else {
          el.setAttribute(key, String(newProps[key]));
        }
      }
    }

    // Update children
    const oldChildren = oldVNode.children || [];
    const newChildren = newVNode.children || [];
    const maxLength = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLength; i++) {
      patchDOM(oldChildren[i], newChildren[i], el, i);
    }
  }

  // Component nodes: re-render and update
  if (newVNode.type === VNodeType.COMPONENT) {
    // Store reference to parent for future re-renders
    newVNode._parent = parentElement;
    newVNode._index = index;

    // Get component function
    const componentFn = newVNode.tag as Function;

    // Store this component in the map for future re-renders
    componentVNodeMap.set(componentFn, {
      vnode: newVNode,
      container: parentElement,
      index,
    });

    // Set current component being rendered for signal tracking
    const prevComponent = currentComponent;
    currentComponent = componentFn;

    // Execute component with new props
    const renderedOutput = componentFn(newVNode.props || {});

    // Reset current component
    currentComponent = prevComponent;

    // Find the parent of the old DOM node
    if (oldVNode._el && oldVNode._el.parentElement) {
      // Replace directly in parent
      patchDOM(oldVNode, renderedOutput, oldVNode._el.parentElement);
    } else {
      // If no parent reference found, fallback to replacing in provided parent
      const newElement = createDOMElement(renderedOutput);

      // Find child at index position
      const childNodes = Array.from(parentElement.childNodes);
      if (index < childNodes.length) {
        parentElement.replaceChild(newElement, childNodes[index]);
      } else {
        parentElement.appendChild(newElement);
      }
    }

    // Save reference to rendered element
    newVNode._el = renderedOutput._el;
  }
}

// Mount a VNode to a DOM element
export function mount(vnode: VNode, container: Element | string): void {
  print("[Renderer] Mount called with:", { vnode, container });

  const containerElement =
    typeof container === "string"
      ? document.querySelector(container)
      : container;

  if (!containerElement) {
    printError(`[Renderer] Container not found: ${container}`);
    throw new Error(`Container not found: ${container}`);
  }

  try {
    print("[Renderer] Creating DOM element from vnode");
    const domElement = createDOMElement(vnode);
    print("[Renderer] DOM element created:", domElement);

    containerElement.innerHTML = "";
    containerElement.appendChild(domElement);

    // Store reference to container for component re-renders if this is a component
    if (vnode.type === VNodeType.COMPONENT) {
      const componentFn = vnode.tag as Function;
      componentVNodeMap.set(componentFn, {
        vnode,
        container: containerElement,
        index: 0,
      });
    }

    print("[Renderer] DOM element appended to container");
  } catch (error) {
    printError("[Renderer] Error mounting component:", error);
    containerElement.innerHTML = `<div class="error">Error: ${
      error instanceof Error ? error.message : String(error)
    }</div>`;
  }
}

// Update a VNode already mounted to the DOM
export function update(
  oldVNode: VNode,
  newVNode: VNode,
  container: Element | string
): void {
  const containerElement =
    typeof container === "string"
      ? document.querySelector(container)
      : container;

  if (!containerElement) {
    throw new Error(`Container not found: ${container}`);
  }

  patchDOM(oldVNode, newVNode, containerElement);
}

// JSX factory function
export function h(
  tag: string | Function | symbol,
  props: Record<string, any> | null = null,
  ...children: (VNode | string | null | undefined)[]
): VNode {
  print("[Renderer] h function called with:", { tag, props, children });

  // Handle fragment
  if (tag === Fragment) {
    return createFragment(children.filter(Boolean) as (VNode | string)[]);
  }

  // Ensure valid props by defaulting to empty object
  const validProps = props || {};

  // Flatten children arrays and filter out null/undefined values
  const flattenedChildren: (VNode | string)[] = [];
  const flattenArray = (arr: any[]): void => {
    for (const item of arr) {
      if (item === null || item === undefined || item === false) {
        continue; // Skip these items
      } else if (Array.isArray(item)) {
        flattenArray(item);
      } else {
        flattenedChildren.push(item);
      }
    }
  };

  flattenArray(children);

  // For function components, ensure we don't return null
  if (typeof tag === "function") {
    try {
      // Get component metadata
      let meta;
      try {
        meta = getComponentMeta(tag);
      } catch (e) {
        // If metadata lookup fails, continue without it
      }

      // Create result using the createComponent function
      const result = createComponent(tag, validProps, ...flattenedChildren);
      print("[Renderer] h function returning for component:", result);
      return result;
    } catch (error) {
      // If component creation fails, return an error element
      printError(`Error creating component ${tag.name || "Anonymous"}:`, error);
      return createElement(
        "div",
        {
          className: "elux-error",
          style: "color: red; padding: 10px; border: 1px solid red;",
        },
        `Error in component ${tag.name || "Anonymous"}: ${error}`
      );
    }
  } else {
    // Regular element - use createElement
    const result = createElement(
      tag as string,
      validProps,
      ...flattenedChildren
    );
    print("[Renderer] h function returning for element:", result);
    return result;
  }
}

// JSX-specific factory
export function jsx(
  tag: string | Function | symbol,
  props: Record<string, any>,
  key?: string
): VNode {
  // Extract children from props
  const { children, ...restProps } = props || {};

  // Add key if provided
  if (key) {
    restProps.key = key;
  }

  // Handle JSX fragment
  if (tag === Fragment) {
    return createFragment(
      Array.isArray(children) ? children : children ? [children] : []
    );
  }

  // Handle component or element
  if (typeof tag === "function") {
    return createComponent(
      tag,
      restProps,
      ...(Array.isArray(children) ? children : children ? [children] : [])
    );
  } else {
    return createElement(
      tag as string,
      restProps,
      ...(Array.isArray(children) ? children : children ? [children] : [])
    );
  }
}

// Support JSX in dev mode
export const jsxDEV = jsx;

// Function to render a component VNode
function renderComponent(vnode: VNode): VNode {
  const Component = vnode.tag as Function;

  // Set currently rendering component
  const prevComponent = currentComponent;
  currentComponent = Component;

  // Execute component with the same props to get fresh output
  const renderedOutput = Component(vnode.props || {});

  // Reset current component
  currentComponent = prevComponent;

  return renderedOutput;
}

// Function to unmount a component
function unmountComponent(vnode: VNode): void {
  const Component = vnode.tag as Function;

  // Remove from component map
  componentVNodeMap.delete(Component);

  // Unmount children
  if (vnode.children) {
    for (const child of vnode.children) {
      unmountVNode(child);
    }
  }
}

// Function to unmount a VNode
function unmountVNode(vnode: VNode): void {
  if (!vnode) return;

  // Different handling based on node type
  if (vnode.type === VNodeType.COMPONENT) {
    unmountComponent(vnode);
  } else if (vnode.type === VNodeType.ELEMENT) {
    // Remove event listeners
    if (vnode.props) {
      for (const [key, value] of Object.entries(vnode.props)) {
        if (key.startsWith("on") && typeof value === "function" && vnode._el) {
          const eventName = key.substring(2).toLowerCase();
          (vnode._el as Element).removeEventListener(eventName, value);
        }
      }
    }

    // Unmount children
    if (vnode.children) {
      for (const child of vnode.children) {
        unmountVNode(child);
      }
    }
  }

  // Remove element from DOM
  if (vnode._el && vnode._el.parentNode) {
    vnode._el.parentNode.removeChild(vnode._el);
  }
}

/**
 * Hydrate the app with server-rendered content
 * This reuses existing DOM nodes instead of replacing them
 */
export function hydrate(container: Element | string): void {
  print("[Renderer] Hydrating with server-rendered content");

  const containerElement =
    typeof container === "string"
      ? document.querySelector(container)
      : container;

  if (!containerElement) {
    printError(`[Renderer] Hydration container not found: ${container}`);
    return;
  }

  // We don't actually re-render, just set up event handlers and state
  // This is a simplified version compared to a full hydration implementation

  // For a real implementation, we would:
  // 1. Create VNodes matching the DOM structure
  // 2. Walk the DOM and attach events from the VNode props
  // 3. Set up component state without replacing the DOM

  print("[Renderer] Server-rendered content hydrated");
}
