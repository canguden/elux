// Virtual DOM node types
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

// Export for signal system to use
export function getCurrentComponent(): Function | null {
  return currentComponent;
}

// Trigger component re-render from signal system
export function reRenderComponent(component: Function): void {
  console.log(`[Renderer] Re-rendering component due to signal change: ${component.name || 'Component'}`);
  
  const data = componentVNodeMap.get(component);
  if (data) {
    const { vnode, container, index } = data;
    
    // Create a new VNode with same props
    console.log(`[Renderer] Creating new VNode for component with props:`, vnode.props);
    const newVNode = createComponent(component, vnode.props || {});
    
    // Store the new VNode in place of the old one
    componentVNodeMap.set(component, {
      vnode: newVNode,
      container,
      index
    });
    
    try {
      // Set current component being rendered
      const prevComponent = currentComponent;
      currentComponent = component;
      
      // Execute component with the same props to get fresh output
      const renderedOutput = component(vnode.props || {});
      
      // Reset current component
      currentComponent = prevComponent;
      
      // Now create a DOM element from the rendered output
      const newElement = createDOMElement(renderedOutput);
      console.log(`[Renderer] Created new DOM element:`, newElement);
      
      // Find the existing element in the DOM
      if (vnode._el && vnode._el.parentElement) {
        console.log(`[Renderer] Replacing existing element in DOM`);
        vnode._el.parentElement.replaceChild(newElement, vnode._el);
        
        // Update element reference
        newVNode._el = newElement;
      } else if (container) {
        console.log(`[Renderer] Appending new element to container`);
        // Clear container at index
        const oldElement = container.children[index];
        if (oldElement) {
          container.replaceChild(newElement, oldElement);
        } else {
          container.appendChild(newElement);
        }
        
        // Update element reference
        newVNode._el = newElement;
      }
      
      console.log(`[Renderer] Component re-rendered successfully`);
    } catch (error) {
      console.error(`[Renderer] Error during component re-render:`, error);
    }
  } else {
    console.warn(`[Renderer] No component data found for re-render:`, component.name);
    
    // Attempt to find any existing component in the DOM with the same name
    if (typeof document !== 'undefined') {
      const possibleElements = document.querySelectorAll('.card-default');
      if (possibleElements.length > 0) {
        console.log(`[Renderer] Found ${possibleElements.length} possible elements to refresh`);
        
        // Re-render the component with empty props as fallback
        try {
          const prevComponent = currentComponent;
          currentComponent = component;
          
          const renderedOutput = component({});
          currentComponent = prevComponent;
          
          const newElement = createDOMElement(renderedOutput);
          
          // Try to replace the first matching element
          if (possibleElements[0].parentElement) {
            possibleElements[0].parentElement.replaceChild(newElement, possibleElements[0]);
            console.log(`[Renderer] Replaced element as fallback`);
          }
        } catch (fallbackError) {
          console.error(`[Renderer] Fallback re-render failed:`, fallbackError);
        }
      }
    }
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
    console.error("Attempted to render undefined or null vnode");
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
        } else if (key !== "children") {
          el.setAttribute(key, String(value));
        }
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
        const childEl = createDOMElement(child);
        fragment.appendChild(childEl);
      }
    }

    // Fragments don't have a direct DOM reference
    return fragment as unknown as Element;
  }

  if (vnode.type === VNodeType.COMPONENT) {
    try {
      // Get the component function
      const componentFn = vnode.tag as Function;

      // Set current component being rendered for signal tracking
      const prevComponent = currentComponent;
      currentComponent = componentFn;

      // Call the component function with its props to get rendered output
      const renderedOutput = componentFn(vnode.props || {});

      // Reset current component
      currentComponent = prevComponent;

      // Create DOM element from the rendered output
      return createDOMElement(renderedOutput);
    } catch (error) {
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

      console.error(`Error rendering component <${componentName}>:`, error);

      return errorEl;
    }
  }

  // Handle unknown type fallback
  throw new Error(`Unknown VNode type: ${vnode.type}`);
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
  console.log("[Renderer] Mount called with:", { vnode, container });

  const containerElement =
    typeof container === "string"
      ? document.querySelector(container)
      : container;

  if (!containerElement) {
    console.error(`[Renderer] Container not found: ${container}`);
    throw new Error(`Container not found: ${container}`);
  }

  try {
    console.log("[Renderer] Creating DOM element from vnode");
    const domElement = createDOMElement(vnode);
    console.log("[Renderer] DOM element created:", domElement);

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

    console.log("[Renderer] DOM element appended to container");
  } catch (error) {
    console.error("[Renderer] Error mounting component:", error);
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
  props: Record<string, any> | null,
  ...children: (VNode | string | null | undefined)[]
): VNode {
  console.log("[Renderer] h function called with:", { tag, props, children });

  // Handle fragment
  if (tag === Fragment) {
    return createFragment(children.filter(Boolean) as (VNode | string)[]);
  }

  // Flatten children arrays
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

  const result =
    typeof tag === "function"
      ? createComponent(tag, props, ...flattenedChildren)
      : createElement(tag as string, props, ...flattenedChildren);

  console.log("[Renderer] h function returning:", result);
  return result;
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
