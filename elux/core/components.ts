/**
 * Elux Framework - Advanced Component System
 * Provides a powerful client/server component architecture with intelligent rendering
 */

import { VNode, VNodeType, h } from "./vdom";
import { print, printError } from "./utils";

// Runtime environment detection
export const isServer = typeof window === "undefined";
export const isClient = !isServer;

// Component types
export enum ComponentType {
  SERVER = "server",
  CLIENT = "client",
  HYBRID = "hybrid", // Can render on both client and server
}

// Component metadata storage
const componentRegistry = new Map<
  Function,
  {
    type: ComponentType;
    isHydrated: boolean;
    instanceId: string | null;
    clientOnly: boolean;
    serverOnly: boolean;
  }
>();

/**
 * Register a component with the Elux component system
 */
export function registerComponent(
  component: Function,
  type: ComponentType = ComponentType.HYBRID,
  options: { clientOnly?: boolean; serverOnly?: boolean } = {}
) {
  componentRegistry.set(component, {
    type,
    isHydrated: false,
    instanceId: null,
    clientOnly: options.clientOnly || false,
    serverOnly: options.serverOnly || false,
  });

  return component;
}

/**
 * Base component wrapper with standard attributes to enhance DX
 */
function createComponentWrapper(
  registeredComponent: Function,
  type: ComponentType,
  props: Record<string, any>,
  renderFn: Function
): VNode {
  try {
    // Create stable ID if not provided
    const componentName = registeredComponent.name || "Anonymous";
    const stableId =
      props._elux_component_id ||
      props.stableId ||
      `${componentName.toLowerCase()}-${Math.random()
        .toString(36)
        .substring(2, 10)}`;

    // Generate output from the render function
    const output = renderFn();

    // If output is a valid vnode, enhance it with standard attributes
    if (output && typeof output === "object" && output.type !== undefined) {
      // Add standard data attributes to help with component detection
      if (!output.props) {
        output.props = {};
      }

      // Add data attributes for component type, ID, and name for easier DOM selection
      output.props["data-component-id"] = stableId;
      output.props["data-component-name"] = componentName;
      output.props["data-component-type"] = type;
      output.props["data-elux-component"] = componentName.toLowerCase();

      // Store original props as data attributes for re-rendering
      for (const [key, value] of Object.entries(props)) {
        // Skip internal props and complex objects
        if (
          !key.startsWith("_elux_") &&
          (typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean")
        ) {
          output.props[`data-prop-${key}`] = String(value);
        }
      }

      return output;
    }

    return output;
  } catch (error) {
    print(`Error in component wrapper: ${error}`);

    // Return error element if component rendering fails
    return {
      type: VNodeType.ELEMENT,
      tag: "div",
      props: {
        className: "elux-error",
        style: "color: red; padding: 10px; border: 1px solid red;",
        "data-component-error": "true",
      },
      children: [
        {
          type: VNodeType.TEXT,
          text: `Error in component: ${error}`,
        },
      ],
    };
  }
}

/**
 * Client component decorator - marks a component to run only on the client
 */
export function eClient(target: Function) {
  // First register the component
  const registered = registerComponent(target, ComponentType.CLIENT, {
    clientOnly: true,
  });

  // Then return a wrapping function that ensures the component is properly called
  return function wrappedClientComponent(props: any = {}) {
    // When this component is rendered, it will use the registered target
    try {
      if (isServer) {
        // On server, return a placeholder with proper attributes
        return createComponentWrapper(
          registered,
          ComponentType.CLIENT,
          props,
          () => ({
            type: VNodeType.ELEMENT,
            tag: "div",
            props: {
              className: "elux-component-placeholder",
            },
            children: [
              {
                type: VNodeType.TEXT,
                text: `Client component placeholder: ${
                  registered.name || "Anonymous"
                }`,
              },
            ],
          })
        );
      } else {
        // On client, call the actual component
        return createComponentWrapper(
          registered,
          ComponentType.CLIENT,
          props,
          () => registered(props)
        );
      }
    } catch (error) {
      print(
        `Error rendering client component ${registered.name || "Anonymous"}:`,
        error
      );

      // Return error element if component rendering fails
      return {
        type: VNodeType.ELEMENT,
        tag: "div",
        props: {
          className: "elux-error",
          style: "color: red; padding: 10px; border: 1px solid red;",
          "data-component-error": "true",
          "data-component-name": registered.name || "Anonymous",
        },
        children: [
          {
            type: VNodeType.TEXT,
            text: `Error in client component ${
              registered.name || "Anonymous"
            }: ${error}`,
          },
        ],
      };
    }
  };
}

/**
 * Server component decorator - marks a component to run only on the server
 */
export function eServer(target: Function) {
  // Register the component
  const registered = registerComponent(target, ComponentType.SERVER, {
    serverOnly: true,
  });

  // Return a wrapper function
  return function wrappedServerComponent(props: any = {}) {
    try {
      if (isClient) {
        // On client, return a placeholder with proper attributes
        return createComponentWrapper(
          registered,
          ComponentType.SERVER,
          props,
          () => ({
            type: VNodeType.ELEMENT,
            tag: "div",
            props: {
              className: "elux-component-placeholder",
            },
            children: [
              {
                type: VNodeType.TEXT,
                text: `Server component placeholder: ${
                  registered.name || "Anonymous"
                }`,
              },
            ],
          })
        );
      } else {
        // On server, call the actual component
        return createComponentWrapper(
          registered,
          ComponentType.SERVER,
          props,
          () => registered(props)
        );
      }
    } catch (error) {
      print(
        `Error rendering server component ${registered.name || "Anonymous"}:`,
        error
      );

      // Return error element if component rendering fails
      return {
        type: VNodeType.ELEMENT,
        tag: "div",
        props: {
          className: "elux-error",
          style: "color: red; padding: 10px; border: 1px solid red;",
          "data-component-error": "true",
          "data-component-name": registered.name || "Anonymous",
        },
        children: [
          {
            type: VNodeType.TEXT,
            text: `Error in server component ${
              registered.name || "Anonymous"
            }: ${error}`,
          },
        ],
      };
    }
  };
}

/**
 * Hybrid component decorator - can run on both client and server
 */
export function eHybrid(target: Function) {
  // Register the component
  const registered = registerComponent(target, ComponentType.HYBRID);

  // Return a wrapper function that ensures proper component rendering
  return function wrappedHybridComponent(props: any = {}) {
    try {
      // Generate a stable ID if not already assigned
      const meta = getComponentMeta(registered);

      if (!meta.instanceId && !props._elux_component_id && !props.stableId) {
        const stableId = `${registered.name || "component"}-${Math.random()
          .toString(36)
          .substring(2, 10)}`;
        setComponentInstanceId(registered, stableId);
      }

      // Call the component with enhanced props and wrap output with standard attributes
      return createComponentWrapper(
        registered,
        ComponentType.HYBRID,
        props,
        () => {
          const componentResult = registered(props);

          // If component returned null/undefined, provide a fallback
          if (componentResult === null || componentResult === undefined) {
            print(
              `Hybrid component ${
                registered.name || "Anonymous"
              } returned null - providing fallback element`
            );

            // Return a minimal valid node
            return {
              type: VNodeType.ELEMENT,
              tag: "div",
              props: {
                className: "elux-component-empty",
              },
              children: [
                {
                  type: VNodeType.TEXT,
                  text: `Component ${
                    registered.name || "Anonymous"
                  } rendered empty content`,
                },
              ],
            };
          }

          return componentResult;
        }
      );
    } catch (error) {
      print(
        `Error rendering hybrid component ${registered.name || "Anonymous"}:`,
        error
      );

      // Return error element if component rendering fails
      return {
        type: VNodeType.ELEMENT,
        tag: "div",
        props: {
          className: "elux-error",
          style: "color: red; padding: 10px; border: 1px solid red;",
          "data-component-error": "true",
          "data-component-name": registered.name || "Anonymous",
        },
        children: [
          {
            type: VNodeType.TEXT,
            text: `Error in hybrid component ${
              registered.name || "Anonymous"
            }: ${error}`,
          },
        ],
      };
    }
  };
}

/**
 * Get component metadata
 */
export function getComponentMeta(component: Function) {
  if (!componentRegistry.has(component)) {
    // Auto-register components that haven't been explicitly registered
    registerComponent(component);
  }

  return componentRegistry.get(component)!;
}

/**
 * Set unique instance ID for a component
 */
export function setComponentInstanceId(
  component: Function,
  instanceId: string
) {
  const meta = getComponentMeta(component);
  meta.instanceId = instanceId;
}

/**
 * Smart component wrapper for automatic client/server handling
 * This is used internally by the framework
 */
export function createSmartComponent(
  componentFn: Function,
  props: Record<string, any> = {}
): VNode {
  const meta = getComponentMeta(componentFn);
  const uniqueId = Math.random().toString(36).substring(2, 15);

  // Set instance ID if not already set
  if (!meta.instanceId) {
    setComponentInstanceId(componentFn, uniqueId);
  }

  // Handle server-only components on client and vice versa
  if ((isClient && meta.serverOnly) || (isServer && meta.clientOnly)) {
    // Return placeholder for server-only components on client
    return h(
      "div",
      {
        className: "elux-component-placeholder",
        "data-component-id": meta.instanceId,
        "data-component-type": meta.type,
      },
      `Component placeholder: ${componentFn.name || "Anonymous"}`
    );
  }

  // Add metadata to props for internal tracking
  const enhancedProps = {
    ...props,
    _elux_component_id: meta.instanceId,
    _elux_component_type: meta.type,
  };

  // Create VNode with enhanced properties
  return {
    type: VNodeType.COMPONENT,
    tag: componentFn,
    props: enhancedProps,
    children: [],
  };
}

/**
 * Higher-order component to make any component client-only
 */
export function withClient<P extends object>(Component: Function) {
  const ClientComponent = (props: P) => {
    const component = Component;
    registerComponent(component, ComponentType.CLIENT, { clientOnly: true });
    return h(component, props);
  };

  // Copy name for debugging
  Object.defineProperty(ClientComponent, "name", {
    value: `Client(${Component.name || "Component"})`,
    configurable: true,
  });

  return ClientComponent;
}

/**
 * Higher-order component to make any component server-only
 */
export function withServer<P extends object>(Component: Function) {
  const ServerComponent = (props: P) => {
    const component = Component;
    registerComponent(component, ComponentType.SERVER, { serverOnly: true });
    return h(component, props);
  };

  // Copy name for debugging
  Object.defineProperty(ServerComponent, "name", {
    value: `Server(${Component.name || "Component"})`,
    configurable: true,
  });

  return ServerComponent;
}

/**
 * Utility for creating a component with a stable instance ID
 * This ensures state is maintained properly between renders
 */
export function createStableComponent(
  component: Function,
  stableId: string,
  props: Record<string, any> = {}
): VNode {
  const meta = getComponentMeta(component);
  setComponentInstanceId(component, stableId);

  return createSmartComponent(component, props);
}

/**
 * Marks whether a component has been hydrated
 */
export function markComponentHydrated(component: Function) {
  const meta = getComponentMeta(component);
  meta.isHydrated = true;
}

/**
 * Check if a component has been hydrated
 */
export function isComponentHydrated(component: Function): boolean {
  const meta = getComponentMeta(component);
  return meta.isHydrated;
}
