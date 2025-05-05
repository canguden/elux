/**
 * Elux Framework - JSX Runtime
 * Custom JSX runtime for use with TypeScript/esbuild
 */

import { VNode, VNodeType } from "./vdom";

// Create a text VNode
export function createTextNode(text: string): VNode {
  return {
    type: VNodeType.TEXT,
    text,
  };
}

// JSX Fragment Symbol
export const Fragment = Symbol("Fragment");

// JSX Factory Function
export function jsx(
  type: string | Function | symbol,
  props: Record<string, any> | null,
  ...children: any[]
): VNode {
  // Process children from props
  const allChildren = [];

  // Add children from props if present
  if (props && props.children) {
    const propsChildren = Array.isArray(props.children)
      ? props.children
      : [props.children];

    allChildren.push(...propsChildren);

    // Remove children from props
    const { children: _, ...restProps } = props;
    props = restProps;
  }

  // Add any additional children
  if (children && children.length > 0) {
    allChildren.push(...children);
  }

  // Process children
  const processedChildren = allChildren
    .flat() // Handle nested arrays
    .filter(Boolean) // Skip nullish values
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? createTextNode(String(child))
        : child
    );

  if (type === Fragment) {
    return {
      type: VNodeType.FRAGMENT,
      children: processedChildren,
    };
  } else if (typeof type === "function") {
    return {
      type: VNodeType.COMPONENT,
      tag: type,
      props: { ...props, children: processedChildren },
      children: processedChildren,
    };
  } else {
    if (typeof type === "symbol" && type !== Fragment) {
      // Convert symbol to string representation for non-Fragment symbols
      return {
        type: VNodeType.ELEMENT,
        tag: String(type),
        props: props || {},
        children: processedChildren,
      };
    } else {
      return {
        type: VNodeType.ELEMENT,
        tag: typeof type === "string" ? type : undefined, // Only use string types
        props: props || {},
        children: processedChildren,
      };
    }
  }
}

// JSX with key spreading
export const jsxs = jsx;

// For backwards compatibility with h
export const h = jsx;
