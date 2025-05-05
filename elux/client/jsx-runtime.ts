import { VNode, Fragment, h, createFragment } from "./renderer";

// For automatic JSX transform
export { Fragment };

// For production builds
export function jsx(
  type: string | Function | symbol,
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
  if (type === Fragment) {
    const childArray = Array.isArray(children)
      ? children
      : children
      ? [children]
      : [];
    return createFragment(childArray);
  }

  // Handle component or element with children
  if (children !== undefined) {
    return h(
      type,
      restProps,
      ...(Array.isArray(children) ? children : [children])
    );
  } else {
    // Handle component or element without children
    return h(type, restProps);
  }
}

// For development builds
export const jsxDEV = jsx;

// For JSX fragments
export const jsxs = jsx;
